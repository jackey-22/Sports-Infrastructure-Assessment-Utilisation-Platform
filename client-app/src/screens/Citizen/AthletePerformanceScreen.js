import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useMemo, useRef, useState } from "react";
import { View, RefreshControl, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "../../components/AppText";
import { Action, Field, ResourceState, EvaluationCard, performanceStyles as s } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import { ACHIEVEMENT_CATEGORIES, achievementPayload } from "../../utils/performance";

const GREEN = "#007D40";

const emptyForm = {
  sportId: "",
  title: "",
  description: "",
  category: ACHIEVEMENT_CATEGORIES[0],
  eventName: "",
  achievementDate: "",
  rank: "",
};

const localDate = (value) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

function statusTone(status) {
  if (status === "Verified") return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (status === "Rejected") return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  return { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" };
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildSportInference(items) {
  const latest = items[0];
  const previous = items[1] || null;
  const earliest = items[items.length - 1];
  const latestScore = Number(latest?.totalScore || 0);
  const scores = items.map((e) => Number(e.totalScore || 0));
  const avgScore = scores.reduce((sum, v) => sum + v, 0) / Math.max(1, scores.length);
  const bestScore = Math.max(...scores);

  let trendText = `Baseline score recorded on ${formatDate(latest?.evaluationDate)} (${latestScore.toFixed(1)}/100).`;
  let trendTone = "neutral";
  if (items.length >= 2 && previous) {
    const deltaLatest = Math.round((latestScore - Number(previous.totalScore || 0)) * 10) / 10;
    const deltaOverall = Math.round((latestScore - Number(earliest.totalScore || 0)) * 10) / 10;
    if (deltaLatest > 0) {
      trendTone = "up";
      trendText = `Up +${deltaLatest.toFixed(1)} pts from last session${items.length > 2 && deltaOverall > 0 ? ` (+${deltaOverall.toFixed(1)} overall across ${items.length} evaluations)` : ""}. Keep building momentum!`;
    } else if (deltaLatest < 0) {
      trendTone = "down";
      trendText = `Down ${Math.abs(deltaLatest).toFixed(1)} pts vs previous evaluation (${Number(previous.totalScore || 0).toFixed(1)} to ${latestScore.toFixed(1)}). Review focus areas below.`;
    } else {
      trendTone = "up";
      trendText = `Steady performance at ${latestScore.toFixed(1)} / 100 across your recent evaluations (avg ${avgScore.toFixed(1)}).`;
    }
  }

  const sortedDetails = [...(latest?.details || [])]
    .filter((d) => Number.isFinite(Number(d.normalizedScore)))
    .sort((a, b) => Number(b.normalizedScore) - Number(a.normalizedScore));

  const strengths = sortedDetails.filter((d) => Number(d.normalizedScore) >= 75).slice(0, 2);
  const focus = [...sortedDetails].reverse().filter((d) => Number(d.normalizedScore) < 85).slice(0, 2);

  return {
    latest,
    avgScore,
    bestScore,
    trendText,
    trendTone,
    strengthsText: strengths.length
      ? strengths.map((d) => `${d.parameterName} (${Math.round(Number(d.normalizedScore))}%)`).join(", ")
      : sortedDetails[0]
        ? `${sortedDetails[0].parameterName} (${Math.round(Number(sortedDetails[0].normalizedScore))}%)`
        : "Evaluating core fundamentals",
    focusText: focus.length
      ? focus.map((d) => `${d.parameterName} (${Math.round(Number(d.normalizedScore))}%)`).join(", ")
      : sortedDetails.length
        ? "All skill parameters are scoring above 85%!"
        : "Complete more sessions for deeper drill insights",
  };
}

export default function AthletePerformanceScreen({ onBack, onProfile }) {
  const evaluations = usePerformanceResource(performanceService.ownEvaluations);
  const achievements = usePerformanceResource(performanceService.achievements);
  const sports = usePerformanceResource(performanceService.sports);

  const [sportId, setSportId] = useState("");
  const [expandedSports, setExpandedSports] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const lock = useRef(false);
  const mounted = useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = () => Promise.all([evaluations.reload(), achievements.reload(), sports.reload()]);

  // Deduplicate sports list cleanly by lowercase name
  const uniqueSports = useMemo(() => {
    const seen = new Map();
    (sports.data || []).forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sports.data]);

  const allEvaluations = useMemo(() => evaluations.data || [], [evaluations.data]);
  const allAchievements = useMemo(() => achievements.data || [], [achievements.data]);

  const filterSports = useMemo(() => {
    const byName = new Map();
    allEvaluations.forEach((ev) => {
      const id = String(ev.sport?._id || ev.sport || "");
      const name = String(ev.sport?.SportName || "Sport").trim();
      const key = name.toLowerCase();
      if (id && !byName.has(key)) byName.set(key, { _id: id, SportName: name });
    });
    return [...byName.values()];
  }, [allEvaluations]);

  const visible = useMemo(
    () => allEvaluations.filter((item) => !sportId || String(item.sport?._id || item.sport) === sportId),
    [allEvaluations, sportId]
  );

  // Consolidate multiple evaluations of the same sport into a single Sport Performance + Inference card
  const sportGroups = useMemo(() => {
    const map = new Map();
    visible.forEach((ev) => {
      const name = String(ev.sport?.SportName || "Sport").trim();
      const id = String(ev.sport?._id || ev.sport || name.toLowerCase());
      const groupKey = name.toLowerCase();
      const existing = map.get(groupKey) || { key: groupKey, sportId: id, sportName: name, items: [] };
      existing.items.push(ev);
      map.set(groupKey, existing);
    });
    return [...map.values()].map((group) => {
      group.items.sort((a, b) => new Date(b.evaluationDate || b.createdAt || 0) - new Date(a.evaluationDate || a.createdAt || 0));
      return {
        ...group,
        ...buildSportInference(group.items),
      };
    });
  }, [visible]);

  const overallStats = useMemo(() => {
    const scored = allEvaluations.filter((item) => Number.isFinite(Number(item.totalScore)));
    const avg = scored.length
      ? Math.round((scored.reduce((sum, item) => sum + Number(item.totalScore), 0) / scored.length) * 10) / 10
      : null;
    const best = scored.length
      ? scored.reduce((top, cur) => (Number(cur.totalScore) > Number(top.totalScore) ? cur : top), scored[0])
      : null;
    const distinctSports = new Set(
      allEvaluations.map((ev) => String(ev.sport?.SportName || ev.sport || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    const verifiedAwards = allAchievements.filter((a) => a.verificationStatus === "Verified").length;
    return {
      avg,
      evalCount: allEvaluations.length,
      distinctSports,
      bestScore: best ? Number(best.totalScore) : null,
      bestSport: best?.sport?.SportName || "—",
      verifiedAwards,
      totalAwards: allAchievements.length,
    };
  }, [allEvaluations, allAchievements]);

  const patch = (values) => setForm((old) => ({ ...old, ...values }));
  const noProfile = evaluations.error === "Athlete profile not found";

  const submit = async () => {
    if (lock.current) return;
    setError("");
    setNotice("");
    let payload;
    try {
      payload = achievementPayload({
        ...form,
        sportId: form.sportId || sportId,
      });
    } catch (err) {
      setError(err.message);
      return;
    }

    lock.current = true;
    setSaving(true);
    try {
      await performanceService.submitAchievement(payload);
      if (mounted.current) {
        setForm({
          ...emptyForm,
          sportId: payload.sportId,
        });
        setShowForm(false);
        setNotice("Achievement submitted for verification.");
        await achievements.reload();
      }
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <View style={localStyles.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={localStyles.content}
        refreshControl={
          <RefreshControl
            tintColor={GREEN}
            colors={[GREEN]}
            refreshing={evaluations.loading || achievements.loading || sports.loading}
            onRefresh={refresh}
          />
        }
        header={
          <AppHeader
            title="Skills & Performance"
            subtitle="Overall evaluation insights, trends & achievements"
            onBack={onBack}
          />
        }
      >
        {/* Top Action Strip */}
        <View style={localStyles.toolbarRow}>
          <TouchableOpacity style={localStyles.toolbarBtn} onPress={onProfile} activeOpacity={0.75}>
            <Ionicons name="person-circle-outline" size={18} color={GREEN} />
            <Text style={localStyles.toolbarBtnText}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={localStyles.toolbarBtn} onPress={refresh} activeOpacity={0.75}>
            <Ionicons name="refresh-outline" size={17} color={GREEN} />
            <Text style={localStyles.toolbarBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {!!notice && <Text style={s.notice}>{notice}</Text>}
        {noProfile && (
          <View style={localStyles.noticeCard}>
            <Ionicons name="information-circle-outline" size={20} color="#065f46" />
            <Text style={localStyles.noticeText}>
              Your account does not have a linked athlete profile yet. Evaluations and achievement submission become available once it is linked.
            </Text>
          </View>
        )}

        {/* Overall Performance KPI Grid (Moved from Home Tab + Enriched) */}
        <View style={localStyles.kpiGrid}>
          <View style={localStyles.kpiCard}>
            <View style={localStyles.kpiHeader}>
              <View style={[localStyles.kpiIcon, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="analytics-outline" size={16} color={GREEN} />
              </View>
              <Text style={localStyles.kpiLabel}>Overall Performance</Text>
            </View>
            <Text style={localStyles.kpiValue}>
              {overallStats.avg == null ? "—" : `${overallStats.avg.toFixed(1)}`}
              {overallStats.avg != null ? <Text style={localStyles.kpiUnit}> / 100</Text> : null}
            </Text>
            <Text style={localStyles.kpiSub}>
              {overallStats.evalCount
                ? `Avg across ${overallStats.evalCount} evaluation${overallStats.evalCount === 1 ? "" : "s"}`
                : "No evaluations yet"}
            </Text>
          </View>

          <View style={localStyles.kpiCard}>
            <View style={localStyles.kpiHeader}>
              <View style={[localStyles.kpiIcon, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="clipboard-outline" size={16} color="#0284c7" />
              </View>
              <Text style={localStyles.kpiLabel}>Evaluations Count</Text>
            </View>
            <Text style={localStyles.kpiValue}>{overallStats.evalCount}</Text>
            <Text style={localStyles.kpiSub}>
              {overallStats.distinctSports
                ? `Across ${overallStats.distinctSports} sport${overallStats.distinctSports === 1 ? "" : "s"}`
                : "Coach assessments"}
            </Text>
          </View>

          <View style={localStyles.kpiCard}>
            <View style={localStyles.kpiHeader}>
              <View style={[localStyles.kpiIcon, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="star-outline" size={16} color="#b45309" />
              </View>
              <Text style={localStyles.kpiLabel}>Best Score</Text>
            </View>
            <Text style={localStyles.kpiValue}>
              {overallStats.bestScore == null ? "—" : `${overallStats.bestScore.toFixed(1)}`}
            </Text>
            <Text style={localStyles.kpiSub}>
              {overallStats.bestScore == null ? "Awaiting evaluation" : overallStats.bestSport}
            </Text>
          </View>

          <View style={localStyles.kpiCard}>
            <View style={localStyles.kpiHeader}>
              <View style={[localStyles.kpiIcon, { backgroundColor: "#f3e8ff" }]}>
                <Ionicons name="trophy-outline" size={16} color="#7e22ce" />
              </View>
              <Text style={localStyles.kpiLabel}>Verified Awards</Text>
            </View>
            <Text style={localStyles.kpiValue}>{overallStats.verifiedAwards}</Text>
            <Text style={localStyles.kpiSub}>
              {overallStats.totalAwards
                ? `${overallStats.totalAwards} total submitted`
                : "Submit achievements below"}
            </Text>
          </View>
        </View>

        {/* Sport Filter Chips (Only when evaluated sports exist) */}
        {filterSports.length > 1 && (
          <View style={localStyles.chipRow}>
            <TouchableOpacity
              style={[localStyles.chip, !sportId && localStyles.chipActive]}
              onPress={() => setSportId("")}
            >
              <Text style={[localStyles.chipText, !sportId && localStyles.chipTextActive]}>
                All Sports ({allEvaluations.length})
              </Text>
            </TouchableOpacity>
            {filterSports.map((sp) => {
              const active = sportId === sp._id;
              return (
                <TouchableOpacity
                  key={sp._id}
                  style={[localStyles.chip, active && localStyles.chipActive]}
                  onPress={() => setSportId(sp._id)}
                >
                  <Text style={[localStyles.chipText, active && localStyles.chipTextActive]}>
                    {sp.SportName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Consolidated Sport Performance & Inference Section */}
        <Text style={localStyles.sectionEyebrow}>SPORT PERFORMANCE &amp; INSIGHTS</Text>
        <ResourceState
          loading={evaluations.loading}
          error={evaluations.error}
          onRetry={evaluations.reload}
          empty={!sportGroups.length}
          emptyText="No evaluations yet. Your coach's session evaluations and improvement insights will appear here."
        />

        {sportGroups.map((group) => {
          const isHistoryOpen = Boolean(expandedSports[group.key]);
          const latest = group.latest;
          return (
            <View key={group.key} style={localStyles.sportCard}>
              {/* Header */}
              <View style={localStyles.sportCardHeader}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={localStyles.sportTitle}>{group.sportName}</Text>
                  <Text style={localStyles.sportMeta}>
                    {group.items.length} evaluation{group.items.length === 1 ? "" : "s"} · Latest on {formatDate(latest?.evaluationDate)}
                  </Text>
                </View>
                <View style={localStyles.scoreBox}>
                  <Text style={localStyles.scoreBig}>{Number(latest?.totalScore || 0).toFixed(1)}</Text>
                  <Text style={localStyles.scoreOutOf}>/ 100</Text>
                </View>
              </View>

              {/* Recognition + Stats Pills */}
              <View style={localStyles.badgeRow}>
                {!!latest?.recognition?.label && (
                  <View style={localStyles.recognitionPill}>
                    <Ionicons name="ribbon-outline" size={13} color="#065f46" />
                    <Text style={localStyles.recognitionText}>{latest.recognition.label}</Text>
                  </View>
                )}
                {group.items.length > 1 && (
                  <View style={localStyles.statMiniPill}>
                    <Text style={localStyles.statMiniText}>
                      Avg {group.avgScore.toFixed(1)} · Best {group.bestScore.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actionable Inference Box */}
              <View style={localStyles.inferenceBox}>
                <View style={localStyles.inferenceHeader}>
                  <MaterialCommunityIcons
                    name={group.trendTone === "up" ? "trending-up" : group.trendTone === "down" ? "trending-down" : "lightbulb-on-outline"}
                    size={17}
                    color={group.trendTone === "down" ? "#b45309" : GREEN}
                  />
                  <Text style={localStyles.inferenceHeading}>Performance Inference</Text>
                </View>
                <Text style={localStyles.inferenceItem}>
                  <Text style={localStyles.inferenceBold}>Trend: </Text>
                  {group.trendText}
                </Text>
                <Text style={localStyles.inferenceItem}>
                  <Text style={localStyles.inferenceBold}>Top Strengths: </Text>
                  {group.strengthsText}
                </Text>
                <Text style={localStyles.inferenceItem}>
                  <Text style={localStyles.inferenceBold}>Focus Area: </Text>
                  {group.focusText}
                </Text>
                {!!latest?.remarks && (
                  <Text style={localStyles.coachNote}>
                    Coach {latest.coach?.Name || "Feedback"}: "{latest.remarks}"
                  </Text>
                )}
              </View>

              {/* Latest Skill Parameters */}
              {(latest?.details || []).length > 0 && (
                <View style={localStyles.paramsWrap}>
                  <Text style={localStyles.paramsHeading}>Latest Skill Breakdown</Text>
                  {latest.details.map((detail) => {
                    const pct = Math.max(0, Math.min(100, Number(detail.normalizedScore) || 0));
                    return (
                      <View key={String(detail.parameterId)} style={localStyles.paramRow}>
                        <View style={localStyles.paramTop}>
                          <Text style={localStyles.paramName}>{detail.parameterName}</Text>
                          <Text style={localStyles.paramPct}>{Math.round(pct)}%</Text>
                        </View>
                        <View style={s.track}>
                          <View style={[s.fill, { width: `${pct}%`, backgroundColor: pct >= 75 ? GREEN : "#d97706" }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Toggle Session History */}
              <TouchableOpacity
                style={localStyles.historyToggleBtn}
                activeOpacity={0.75}
                onPress={() =>
                  setExpandedSports((prev) => ({
                    ...prev,
                    [group.key]: !prev[group.key],
                  }))
                }
              >
                <Ionicons name="time-outline" size={16} color={GREEN} />
                <Text style={localStyles.historyToggleText}>
                  {isHistoryOpen
                    ? `Hide session evaluations (${group.items.length})`
                    : `View all ${group.items.length} session evaluation${group.items.length === 1 ? "" : "s"}`}
                </Text>
                <Ionicons name={isHistoryOpen ? "chevron-up" : "chevron-down"} size={16} color={GREEN} />
              </TouchableOpacity>

              {isHistoryOpen && (
                <View style={localStyles.historyList}>
                  {group.items.map((ev) => (
                    <View key={ev._id} style={localStyles.sessionHistoryWrap}>
                      <EvaluationCard evaluation={ev} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Achievements Header + Toggle Button */}
        <View style={localStyles.sectionHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={localStyles.sectionEyebrow}>ACHIEVEMENTS &amp; MEDALS</Text>
            <Text style={s.muted}>Record medals, tournament wins, and milestones.</Text>
          </View>
          <Action
            secondary={showForm}
            disabled={noProfile || evaluations.loading}
            onPress={() => {
              setError("");
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? "Cancel" : "+ Add Award"}
          </Action>
        </View>

        {/* Collapsible Submission Form */}
        {showForm && (
          <View style={[s.card, localStyles.formCard]}>
            <Text style={s.title}>New achievement submission</Text>
            <Field label="Achievement sport">
              <Picker
                enabled={!saving && !noProfile}
                selectedValue={form.sportId || sportId}
                onValueChange={(value) => patch({ sportId: value })}
              >
                <Picker.Item label="Select sport" value="" />
                {uniqueSports.map((sport) => (
                  <Picker.Item key={sport._id} value={String(sport._id)} label={sport.SportName} />
                ))}
              </Picker>
            </Field>
            <Field label="Category">
              <Picker
                enabled={!saving && !noProfile}
                selectedValue={form.category}
                onValueChange={(category) => patch({ category })}
              >
                {ACHIEVEMENT_CATEGORIES.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </Field>
            <Field
              label="Title"
              maxLength={200}
              placeholder="e.g. State Championship Gold Medal"
              value={form.title}
              onChangeText={(title) => patch({ title })}
              editable={!saving && !noProfile}
            />
            {Platform.OS === "web" ? (
              <Field
                label="Achievement date (YYYY-MM-DD)"
                placeholder="YYYY-MM-DD"
                value={form.achievementDate}
                onChangeText={(achievementDate) => patch({ achievementDate })}
                editable={!saving && !noProfile}
              />
            ) : (
              <Field label="Achievement date">
                <Action
                  secondary
                  disabled={saving || noProfile}
                  onPress={() => {
                    if (!form.achievementDate) patch({ achievementDate: localDate(new Date()) });
                    setDateOpen(true);
                  }}
                >
                  {form.achievementDate || "Select date"}
                </Action>
                {dateOpen && (
                  <>
                    <DateTimePicker
                      value={form.achievementDate ? new Date(`${form.achievementDate}T12:00:00`) : new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        if (Platform.OS !== "ios") setDateOpen(false);
                        if (date && event.type !== "dismissed") {
                          patch({ achievementDate: localDate(date) });
                        }
                      }}
                    />
                    {Platform.OS === "ios" && (
                      <Action secondary onPress={() => setDateOpen(false)}>Done</Action>
                    )}
                  </>
                )}
              </Field>
            )}
            <Field
              label="Event / competition"
              maxLength={200}
              placeholder="e.g. Gujarat State Athletics Meet"
              value={form.eventName}
              onChangeText={(eventName) => patch({ eventName })}
              editable={!saving && !noProfile}
            />
            <Field
              label="Rank / position"
              maxLength={50}
              placeholder="e.g. 1st Place"
              value={form.rank}
              onChangeText={(rank) => patch({ rank })}
              editable={!saving && !noProfile}
            />
            <Field
              label="Description"
              maxLength={4000}
              multiline
              placeholder="Details about the event, timing, or award"
              value={form.description}
              onChangeText={(description) => patch({ description })}
              editable={!saving && !noProfile}
            />
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>{error}</Text>
            )}
            <View style={s.row}>
              <Action
                disabled={saving || noProfile || !uniqueSports.length || evaluations.loading}
                onPress={submit}
              >
                {saving ? "Submitting..." : "Submit achievement"}
              </Action>
              <Action secondary disabled={saving} onPress={() => setShowForm(false)}>
                Cancel
              </Action>
            </View>
          </View>
        )}

        {/* Submitted Achievements */}
        <ResourceState
          loading={achievements.loading}
          error={achievements.error}
          onRetry={achievements.reload}
          empty={!allAchievements.length}
          emptyText="No achievements submitted yet. Tap '+ Add Award' above to record one."
        />
        {allAchievements.map((item) => {
          const tone = statusTone(item.verificationStatus);
          return (
            <View key={item._id} style={localStyles.sportCard}>
              <View style={localStyles.cardTopRow}>
                <View style={localStyles.sportBadge}>
                  <Text style={localStyles.sportBadgeText}>
                    {item.sport?.SportName || "Sport"} · {item.category}
                  </Text>
                </View>
                <View
                  style={[
                    localStyles.statusPill,
                    { backgroundColor: tone.bg, borderColor: tone.border },
                  ]}
                >
                  <Text style={[localStyles.statusText, { color: tone.text }]}>
                    {item.verificationStatus}
                  </Text>
                </View>
              </View>
              <Text style={localStyles.awardTitle}>{item.title}</Text>
              <Text style={s.muted}>
                {item.achievementDate ? formatDate(item.achievementDate) : ""}
                {item.eventName ? ` · ${item.eventName}` : ""}
                {item.rank ? ` (${item.rank})` : ""}
              </Text>
              {!!item.description && <Text style={s.body}>{item.description}</Text>}
              {!!item.verificationRemarks && (
                <Text style={s.muted}>Remarks: {item.verificationRemarks}</Text>
              )}
              {!!item.verifiedBy?.Name && (
                <Text style={s.muted}>Reviewed by {item.verifiedBy.Name}</Text>
              )}
            </View>
          );
        })}
      </AppScreenScroll>
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  toolbarRow: {
    flexDirection: "row",
    gap: 10,
  },
  toolbarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  toolbarBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    color: "#065f46",
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48.3%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiLabel: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  kpiUnit: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748b",
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 15,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  sportCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  sportCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sportTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  sportMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  scoreBig: {
    fontSize: 20,
    fontWeight: "800",
    color: GREEN,
  },
  scoreOutOf: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
    marginLeft: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recognitionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recognitionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065f46",
  },
  statMiniPill: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statMiniText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  inferenceBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 6,
  },
  inferenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  inferenceHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#14532d",
  },
  inferenceItem: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#1e293b",
  },
  inferenceBold: {
    fontWeight: "800",
    color: "#065f46",
  },
  coachNote: {
    marginTop: 2,
    fontSize: 12,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 17,
  },
  paramsWrap: {
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  paramsHeading: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#334155",
  },
  paramRow: {
    gap: 5,
  },
  paramTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  paramName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0f172a",
  },
  paramPct: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  historyToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },
  historyList: {
    gap: 10,
    paddingTop: 4,
  },
  sessionHistoryWrap: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  formCard: {
    borderColor: GREEN,
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  sportBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sportBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065f46",
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  awardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
});
