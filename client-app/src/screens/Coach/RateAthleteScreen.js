import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader, { APP_BACKGROUND } from "../../components/common/AppHeader";
import { ResourceState } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import {
  evaluationPayload,
  evaluationPreview,
  preferredSport,
} from "../../utils/performance";

function defaultValueForParam(param) {
  if (param.evaluationType === "qualitative") {
    const max = Number(param.maxScore) || 5;
    return String(Math.min(4, max));
  }
  const min = Number(param.benchmark?.min);
  const max = Number(param.benchmark?.max);
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    return String(Math.round((min + max) / 2));
  }
  return "0";
}

function clampParamValue(param, val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  if (param.evaluationType === "qualitative") {
    const max = Number(param.maxScore) || 5;
    return Math.min(max, Math.max(0, Math.round(num)));
  }
  const min = Number(param.benchmark?.min);
  const max = Number(param.benchmark?.max);
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    return Math.min(max, Math.max(min, num));
  }
  return num;
}

export default function RateAthleteScreen({ athlete, onBack, onSaved }) {
  const roster = usePerformanceResource(performanceService.coachRoster);
  const [selected, setSelected] = useState(athlete || null);
  const [selectedSessionId, setSelectedSessionId] = useState(
    athlete?.selectedBookingId || athlete?.bookingId || ""
  );
  const [sportId, setSportId] = useState(
    athlete?.selectedSportId || preferredSport(athlete)
  );
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const playableSessions = useMemo(
    () => (selected?.sessions || []).filter((sess) => sess.canRate),
    [selected]
  );

  const activeSession = useMemo(
    () =>
      playableSessions.find((s) => s.id === selectedSessionId) ||
      playableSessions.find((s) => !s.isEvaluated) ||
      playableSessions[0] ||
      null,
    [playableSessions, selectedSessionId]
  );

  useEffect(() => {
    if (activeSession) {
      if (!selectedSessionId) setSelectedSessionId(activeSession.id);
      if (activeSession.sportId && activeSession.sportId !== sportId) {
        setSportId(activeSession.sportId);
      }
    }
  }, [activeSession, selectedSessionId, sportId]);

  const loadTemplate = useCallback(async (targetSportId) => {
    if (!targetSportId) {
      setTemplate(null);
      setTemplateError("");
      return;
    }
    setTemplateLoading(true);
    setTemplateError("");
    try {
      const val = await performanceService.template(targetSportId);
      if (!mounted.current) return;
      if (val?.parameters?.length) {
        setTemplate(val);
      } else {
        setTemplate(null);
        setTemplateError("No active evaluation parameters found for this sport.");
      }
    } catch (err) {
      if (!mounted.current) return;
      setTemplate(null);
      setTemplateError(
        err?.message ||
          "No published evaluation template found for this sport. Publish one in Admin first."
      );
    } finally {
      if (mounted.current) setTemplateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected && sportId) {
      loadTemplate(sportId);
    }
  }, [selected, sportId, loadTemplate]);

  useEffect(() => {
    if (!template?.parameters?.length) return;
    const savedDetails = activeSession?.evaluationDetails?.length
      ? activeSession.evaluationDetails
      : activeSession?.isEvaluated &&
          String(selected?.latestEvaluation?.sport?._id || selected?.latestEvaluation?.sport || "") === String(sportId)
        ? selected?.latestEvaluation?.details || []
        : [];
    const savedByParam = new Map(
      savedDetails.map((detail) => [
        String(detail.parameterId?._id || detail.parameterId),
        String(detail.actualValue),
      ])
    );
    const nextScores = {};
    template.parameters
      .filter((p) => p.active)
      .forEach((p) => {
        nextScores[p._id] = savedByParam.has(String(p._id))
          ? savedByParam.get(String(p._id))
          : defaultValueForParam(p);
      });
    setScores(nextScores);
    const nextRemarks =
      activeSession?.evaluationRemarks ||
      (activeSession?.isEvaluated &&
      String(selected?.latestEvaluation?.sport?._id || selected?.latestEvaluation?.sport || "") === String(sportId)
        ? selected?.latestEvaluation?.remarks || ""
        : "");
    setRemarks(nextRemarks);
  }, [template, activeSession, selected, sportId]);

  const activeParameters = useMemo(
    () => (template?.parameters || []).filter((p) => p.active),
    [template]
  );

  const preview = useMemo(
    () => (template ? evaluationPreview(template, scores) : null),
    [template, scores]
  );

  const stepParam = (param, delta) => {
    const current = Number(scores[param._id]);
    const base = Number.isFinite(current) ? current : 0;
    const next = clampParamValue(param, base + delta);
    setScores((prev) => ({ ...prev, [param._id]: String(next) }));
  };

  const handleSelectAthlete = (ath) => {
    const sessions = (ath.sessions || []).filter((s) => s.canRate);
    const preferred = sessions.find((s) => !s.isEvaluated) || sessions[0] || null;
    setSelected(ath);
    setSelectedSessionId(preferred?.id || "");
    setSportId(preferred?.sportId || preferredSport(ath));
    setSubmitError("");
  };

  const handleSubmitEvaluation = async () => {
    if (lock.current) return;
    setSubmitError("");

    if (!remarks.trim()) {
      setSubmitError("Please add coach feedback or observations before submitting.");
      return;
    }

    let payload;
    try {
      payload = evaluationPayload(
        selected,
        sportId,
        template,
        scores,
        remarks,
        activeSession?.id || selectedSessionId
      );
    } catch (validationError) {
      setSubmitError(validationError.message);
      return;
    }

    lock.current = true;
    setSaving(true);
    try {
      const saved = await performanceService.evaluate(payload);
      const savedScore = Number(saved?.totalScore ?? preview?.total ?? 0).toFixed(2);
      if (mounted.current) {
        Alert.alert(
          "Session Evaluated",
          `Score ${savedScore} / 100 recorded for ${selected?.name || "athlete"}.`,
          [
            {
              text: "OK",
              onPress: () => {
                onSaved?.(saved);
                if (!onSaved) onBack?.();
              },
            },
          ]
        );
      }
    } catch (err) {
      const msg =
        err?.message || "Could not save session evaluation. Check your connection and try again.";
      if (mounted.current) {
        setSubmitError(msg);
        Alert.alert("Evaluation Failed", msg);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const eligibleAthletes = useMemo(() => {
    const list = (roster.data?.athletes || []).filter(
      (item) => item.canRate && (item.sessions || []).some((s) => s.canRate)
    );
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      `${item.name} ${(item.sports || []).map((s) => s.name).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [roster.data, search]);

  const athleteName = selected?.name || "Athlete";
  const sportLabel =
    activeSession?.sport ||
    selected?.sessionSport ||
    selected?.sports?.find((s) => String(s.id) === String(sportId))?.name ||
    selected?.sport ||
    "Sport";

  return (
    <View style={styles.root}>
      <AppScreenScroll
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={roster.loading}
            onRefresh={roster.reload}
            tintColor="#007D40"
            colors={["#007D40"]}
          />
        }
        header={
          <AppHeader
            title="Rate Session"
            subtitle="Evaluate completed athlete session performance"
            onBack={saving ? undefined : onBack}
          />
        }
      >
        {!selected ? (
          <View style={styles.selectorContainer}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#64748b"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search eligible athletes..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ResourceState
              loading={roster.loading}
              error={roster.error}
              onRetry={roster.reload}
              empty={!roster.loading && !roster.error && eligibleAthletes.length === 0}
              emptyText="No athletes with completed paid sessions are ready for evaluation."
            />

            {eligibleAthletes.map((ath) => (
              <TouchableOpacity
                key={ath.id}
                style={styles.athletePickCard}
                activeOpacity={0.75}
                onPress={() => handleSelectAthlete(ath)}
              >
                <View style={styles.athleteAvatarCircle}>
                  <Ionicons name="person-outline" size={20} color="#007D40" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pickName} numberOfLines={1}>
                    {ath.name}
                  </Text>
                  <Text style={styles.pickSport} numberOfLines={1}>
                    {(ath.sports || []).map((s) => s.name).join(", ") || "Sport"} ·{" "}
                    {(ath.sessions || []).filter((s) => s.canRate).length} playable
                    sessions
                  </Text>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Select</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.formPad}>
            <View style={styles.athleteCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={22} color="#007D40" />
              </View>
              <View style={styles.athleteInfoCol}>
                <Text style={styles.athleteName} numberOfLines={1}>
                  {athleteName}
                </Text>
                <Text style={styles.athleteSportText}>{sportLabel}</Text>
                {activeSession ? (
                  <Text style={styles.sessionMetaText}>
                    Session: {activeSession.date}
                    {activeSession.time?.from ? ` · ${activeSession.time.from}` : ""}
                    {activeSession.isEvaluated
                      ? ` · Previous: ${Number(activeSession.evaluationScore || 0).toFixed(1)}/100`
                      : " · Pending Rating"}
                  </Text>
                ) : null}
              </View>
            </View>

            {playableSessions.length > 1 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Select Coaching Session</Text>
                <View style={styles.sessionChipsWrap}>
                  {playableSessions.map((sess) => {
                    const active = sess.id === activeSession?.id;
                    return (
                      <TouchableOpacity
                        key={sess.id}
                        style={[
                          styles.sessionChip,
                          active && styles.sessionChipActive,
                        ]}
                        onPress={() => {
                          setSelectedSessionId(sess.id);
                          if (sess.sportId) setSportId(sess.sportId);
                        }}
                      >
                        <Text
                          style={[
                            styles.sessionChipText,
                            active && styles.sessionChipTextActive,
                          ]}
                        >
                          {sess.date} ({sess.sport})
                          {sess.isEvaluated ? " ✓" : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Evaluation Parameters</Text>
              {templateLoading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#007D40" />
                  <Text style={styles.mutedText}>
                    Loading published {sportLabel} template...
                  </Text>
                </View>
              ) : templateError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{templateError}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => loadTemplate(sportId)}
                  >
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {activeParameters.map((param) => {
                    const isQual = param.evaluationType === "qualitative";
                    const maxLabel = isQual
                      ? Number(param.maxScore) || 5
                      : Number(param.benchmark?.max ?? 100);
                    const minLabel = isQual ? 0 : Number(param.benchmark?.min ?? 0);

                    return (
                      <View key={param._id} style={styles.paramRow}>
                        <View style={styles.paramInfo}>
                          <Text style={styles.paramName}>{param.name}</Text>
                          <Text style={styles.paramHint}>
                            {isQual
                              ? `Scale 0–${maxLabel} · ${param.weightage}% weight`
                              : `Range ${minLabel}–${maxLabel} · ${param.weightage}% weight`}
                          </Text>
                        </View>

                        <View style={styles.stepperRow}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => stepParam(param, -1)}
                          >
                            <Ionicons name="remove" size={16} color="#334155" />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.scoreInput}
                            value={String(scores[param._id] ?? "")}
                            keyboardType="numeric"
                            onChangeText={(txt) =>
                              setScores((prev) => ({
                                ...prev,
                                [param._id]: txt,
                              }))
                            }
                          />
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => stepParam(param, 1)}
                          >
                            <Ionicons name="add" size={16} color="#334155" />
                          </TouchableOpacity>
                          <Text style={styles.outOfLabel}>/ {maxLabel}</Text>
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.totalScoreBanner}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons
                        name="medal-outline"
                        size={22}
                        color="#007D40"
                        style={{ marginRight: 8 }}
                      />
                      <View>
                        <Text style={styles.totalScoreTitle}>
                          Weighted Total
                        </Text>
                        <Text style={styles.totalScoreSub}>
                          Template v{template?.version || 1} ({sportLabel})
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.totalScoreNumber}>
                      {preview ? preview.total.toFixed(2) : "0.00"}{" "}
                      <Text style={styles.totalOutOf}>/ 100</Text>
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Coach Feedback &amp; Remarks *</Text>
              <TextInput
                style={styles.remarksInput}
                placeholder="Observations, strengths, and next-session focus..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={500}
                value={remarks}
                onChangeText={setRemarks}
              />
              {submitError ? (
                <Text style={[styles.errorText, { marginTop: 8 }]}>
                  {submitError}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (saving || !template || !preview?.valid) && { opacity: 0.6 },
              ]}
              activeOpacity={0.8}
              disabled={saving || !template || !preview?.valid}
              onPress={handleSubmitEvaluation}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#ffffff"
              />
              <Text style={styles.submitBtnText}>
                {saving
                  ? "Submitting..."
                  : activeSession?.isEvaluated
                    ? "Update Session Evaluation"
                    : "Submit Session Evaluation"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 28 }} />
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_BACKGROUND },
  scrollContent: { flexGrow: 1, backgroundColor: APP_BACKGROUND },
  selectorContainer: { padding: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: "#0f172a" },
  athletePickCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  athleteAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pickName: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  pickSport: { fontSize: 12, color: "#475569", marginTop: 2 },
  selectBtn: {
    backgroundColor: "#007D40",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  selectBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  formPad: { padding: 16, gap: 12 },
  athleteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  athleteInfoCol: { flex: 1 },
  athleteName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  athleteSportText: { fontSize: 13, fontWeight: "700", color: "#007D40", marginTop: 2 },
  sessionMetaText: { fontSize: 12, color: "#475569", marginTop: 2 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 14.5, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  sessionChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sessionChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  sessionChipActive: { borderColor: "#007D40", backgroundColor: "#ecfdf5" },
  sessionChipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  sessionChipTextActive: { color: "#007D40", fontWeight: "700" },
  centerState: { alignItems: "center", paddingVertical: 16, gap: 8 },
  mutedText: { fontSize: 12.5, color: "#64748b" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorText: { fontSize: 12.5, fontWeight: "600", color: "#b91c1c" },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryBtnText: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },
  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  paramInfo: { flex: 1 },
  paramName: { fontSize: 13.5, fontWeight: "700", color: "#0f172a" },
  paramHint: { fontSize: 11.5, color: "#64748b", marginTop: 2 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 30,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scoreInput: {
    width: 46,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    paddingVertical: 0,
  },
  outOfLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", minWidth: 32 },
  totalScoreBanner: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalScoreTitle: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  totalScoreSub: { fontSize: 11, color: "#475569" },
  totalScoreNumber: { fontSize: 20, fontWeight: "800", color: "#007D40" },
  totalOutOf: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  remarksInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 13.5,
    color: "#0f172a",
  },
  submitBtn: {
    backgroundColor: "#007D40",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: { color: "#ffffff", fontSize: 14.5, fontWeight: "800" },
});
