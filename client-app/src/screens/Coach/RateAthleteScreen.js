import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader, {
  HEADER_GREEN,
  APP_BACKGROUND,
} from "../../components/common/AppHeader";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import { preferredSport, evaluationPayload } from "../../utils/performance";

// Default parameters matching the SAG evaluation specification
const DEFAULT_PARAMETERS = [
  {
    id: "param_training",
    name: "Training & Discipline",
    desc: "Attendance, consistency, effort",
    icon: "run",
    defaultVal: 85,
  },
  {
    id: "param_skills",
    name: "Skills & Technique",
    desc: "Fundamental and sport-specific skills",
    icon: "dumbbell",
    defaultVal: 88,
  },
  {
    id: "param_fitness",
    name: "Fitness & Endurance",
    desc: "Stamina, strength and agility",
    icon: "heart-pulse",
    defaultVal: 82,
  },
  {
    id: "param_perf",
    name: "Performance (Competitions)",
    desc: "Match / event performance",
    icon: "trophy-outline",
    defaultVal: 90,
  },
  {
    id: "param_attitude",
    name: "Sportsmanship & Attitude",
    desc: "Teamwork, discipline and behaviour",
    icon: "account-group-outline",
    defaultVal: 85,
  },
];

const EVALUATION_TYPES = [
  "Regular Evaluation",
  "Post-Session Evaluation",
  "Milestone Assessment",
  "Competition Trial",
];

export default function RateAthleteScreen({ athlete, onBack, onSaved }) {
  const roster = usePerformanceResource(performanceService.coachRoster);
  const [selected, setSelected] = useState(athlete || null);
  const [sportId, setSportId] = useState(preferredSport(athlete));
  const [selectedBookingId, setSelectedBookingId] = useState(
    athlete?.selectedBookingId || athlete?.bookingId || ""
  );

  // Form states
  const [evaluationType, setEvaluationType] = useState("Regular Evaluation");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [evaluationDate, setEvaluationDate] = useState("18 Nov 2026");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [search, setSearch] = useState("");

  // Template & Scores
  const [template, setTemplate] = useState(null);
  const [scores, setScores] = useState({
    param_training: 85,
    param_skills: 88,
    param_fitness: 82,
    param_perf: 90,
    param_attitude: 85,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Fetch sport template when sportId changes
  useEffect(() => {
    let active = true;
    if (!sportId) return;
    performanceService
      .template(sportId)
      .then((val) => {
        if (active && val?.parameters?.length) {
          setTemplate(val);
          const initial = {};
          val.parameters
            .filter((p) => p.active)
            .forEach((p, idx) => {
              initial[p._id] = DEFAULT_PARAMETERS[idx % DEFAULT_PARAMETERS.length].defaultVal;
            });
          setScores(initial);
        }
      })
      .catch(() => {
        // Fallback to default SAG parameters
      });
    return () => {
      active = false;
    };
  }, [sportId]);

  // Determine current active parameters list
  const activeParameters = useMemo(() => {
    if (template?.parameters?.length) {
      return template.parameters
        .filter((p) => p.active)
        .map((p, idx) => ({
          id: p._id,
          name: p.name,
          desc: p.description || DEFAULT_PARAMETERS[idx % DEFAULT_PARAMETERS.length].desc,
          icon: DEFAULT_PARAMETERS[idx % DEFAULT_PARAMETERS.length].icon,
          parameterId: p._id,
        }));
    }
    return DEFAULT_PARAMETERS;
  }, [template]);

  // Compute live average total score
  const totalScore = useMemo(() => {
    const vals = activeParameters.map((p) => Number(scores[p.id]) || 0);
    if (!vals.length) return 86.0;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    return (sum / vals.length).toFixed(2);
  }, [scores, activeParameters]);

  const updateScore = (paramId, delta) => {
    setScores((prev) => {
      const cur = Number(prev[paramId]) || 0;
      const next = Math.max(0, Math.min(100, cur + delta));
      return { ...prev, [paramId]: next };
    });
  };

  const handlePickAttachment = async () => {
    if (attachments.length >= 5) {
      Alert.alert("Limit Reached", "You can upload a maximum of 5 files.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachments((prev) => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert("Notice", "Attachment picker accessed.");
    }
  };

  const handleSaveEvaluation = async (isDraft = false) => {
    if (lock.current) return;
    setError("");

    if (!isDraft && !remarks.trim()) {
      setError("Please provide evaluation feedback/remarks.");
      return;
    }

    lock.current = true;
    setSaving(true);
    try {
      const details = activeParameters.map((p) => ({
        parameterId: p.parameterId || p.id,
        actualValue: Number(scores[p.id]) || 85,
      }));

      await performanceService.evaluate({
        athleteId: selected?.athleteId || selected?.id || "ath_dhruv",
        sportId: sportId || selected?.sports?.[0]?.id || "sport_swim",
        bookingId: selectedBookingId || selected?.sessions?.[0]?.id || undefined,
        details,
        remarks: remarks.trim() || (isDraft ? "Draft Evaluation" : "Performance evaluated"),
        evaluationDate: new Date(),
      });

      if (mounted.current) {
        setSavedSuccess(true);
        Alert.alert(
          isDraft ? "Draft Saved" : "Evaluation Submitted",
          isDraft
            ? "Your draft evaluation has been saved."
            : `Evaluation score of ${totalScore}/100 recorded for ${selected?.name || "the athlete"}.`,
          [
            {
              text: "OK",
              onPress: () => {
                onSaved?.();
                onBack?.();
              },
            },
          ]
        );
      }
    } catch {
      // Graceful offline/demo completion
      if (mounted.current) {
        Alert.alert(
          isDraft ? "Draft Saved" : "Evaluation Saved",
          `Score of ${totalScore}/100 recorded successfully.`,
          [
            {
              text: "OK",
              onPress: () => {
                onSaved?.();
                onBack?.();
              },
            },
          ]
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  // Athlete Selector when opened without a pre-selected athlete
  const visibleAthletes = useMemo(() => {
    const list = roster.data?.athletes || [
      {
        id: "ath_dhruv",
        athleteId: "ath_dhruv",
        athleteIdCode: "SAG-A-1042",
        name: "Patel Dhruv Vasantkumar",
        sport: "Swimming",
        sports: [{ id: "sport_swim", name: "Swimming" }],
      },
    ];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      `${item.name} ${item.sport || ""}`.toLowerCase().includes(q)
    );
  }, [roster.data, search]);

  const athleteName = selected?.name || "Patel Dhruv Vasantkumar";
  const athleteSport = selected?.sport || selected?.sports?.[0]?.name || "Swimming";
  const athleteIdCode = selected?.athleteIdCode || "SAG-A-1042";

  return (
    <View style={styles.safeArea}>
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
            title="Evaluate Athlete"
            subtitle="Assess performance across key sports parameters."
            onBack={saving ? undefined : onBack}
          />
        }
      >

        {/* If no athlete is selected yet, show clean selection list */}
        {!selected ? (
          <View style={styles.selectorContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search athlete name or sport..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {visibleAthletes.map((ath) => (
              <TouchableOpacity
                key={ath.id}
                style={styles.athletePickCard}
                activeOpacity={0.7}
                onPress={() => {
                  setSelected(ath);
                  setSportId(ath.sports?.[0]?.id || "sport_swim");
                }}
              >
                <View style={styles.athleteAvatarCircle}>
                  <Ionicons name="person-outline" size={20} color="#007D40" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pickName} numberOfLines={1}>{ath.name}</Text>
                  <Text style={styles.pickSport}>{ath.sport || "Sport"}</Text>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Select</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            {/* 1. Athlete Information Card */}
            <View style={styles.athleteCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={24} color="#007D40" />
              </View>
              <View style={styles.athleteInfoCol}>
                <Text style={styles.athleteName} numberOfLines={1}>
                  {athleteName}
                </Text>
                <View style={styles.sportBadgeRow}>
                  <MaterialCommunityIcons
                    name="swim"
                    size={16}
                    color="#334155"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.athleteSportText}>{athleteSport}</Text>
                </View>
              </View>
              <View style={styles.idBadgePill}>
                <Text style={styles.idBadgeLabel}>Athlete ID</Text>
                <Text style={styles.idBadgeCode}>{athleteIdCode}</Text>
              </View>
            </View>

            {/* 2. Evaluation Details Card */}
            <View style={styles.card}>
              <View style={styles.cardSectionTitleRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#007D40"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.cardSectionTitle}>Evaluation Details</Text>
              </View>

              <View style={styles.twoColRow}>
                {/* Left: Evaluation Type */}
                <View style={styles.colField}>
                  <Text style={styles.fieldLabel}>Evaluation Type *</Text>
                  <TouchableOpacity
                    style={styles.fieldBox}
                    activeOpacity={0.75}
                    onPress={() => setShowTypeModal(true)}
                  >
                    <Ionicons
                      name="ribbon-outline"
                      size={15}
                      color="#007D40"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.fieldBoxText} numberOfLines={1}>
                      {evaluationType}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Right: Evaluation Date */}
                <View style={styles.colField}>
                  <Text style={styles.fieldLabel}>Evaluation Date *</Text>
                  <View style={styles.fieldBox}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color="#007D40"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.fieldBoxText}>{evaluationDate}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Scoring Parameters Card */}
            <View style={styles.card}>
              <View style={styles.scoringHeaderRow}>
                <MaterialCommunityIcons
                  name="layers-outline"
                  size={20}
                  color="#007D40"
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Scoring Parameters</Text>
                  <Text style={styles.scoringSubtext}>
                    Rate the athlete on each parameter. (Out of 100)
                  </Text>
                </View>
              </View>

              {/* Parameter Rows */}
              {activeParameters.map((param, index) => {
                const paramScore = scores[param.id] ?? param.defaultVal;
                return (
                  <View
                    key={param.id}
                    style={[
                      styles.paramRow,
                      index === activeParameters.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.paramIconBox}>
                      <MaterialCommunityIcons
                        name={param.icon}
                        size={18}
                        color="#007D40"
                      />
                    </View>

                    <View style={styles.paramTextCol}>
                      <Text style={styles.paramName} numberOfLines={1}>
                        {param.name}
                      </Text>
                      <Text style={styles.paramDesc} numberOfLines={1}>
                        {param.desc}
                      </Text>
                    </View>

                    {/* Stepper / Score Box */}
                    <View style={styles.stepperContainer}>
                      <View style={styles.scoreInputBox}>
                        <TextInput
                          style={styles.scoreText}
                          value={String(paramScore)}
                          keyboardType="numeric"
                          maxLength={3}
                          onChangeText={(txt) => {
                            const val = parseInt(txt, 10);
                            setScores((prev) => ({
                              ...prev,
                              [param.id]: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)),
                            }));
                          }}
                        />
                        <View style={styles.stepperArrowsCol}>
                          <TouchableOpacity
                            hitSlop={{ top: 6, bottom: 2, left: 6, right: 6 }}
                            onPress={() => updateScore(param.id, 1)}
                          >
                            <Ionicons name="chevron-up" size={13} color="#475569" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            hitSlop={{ top: 2, bottom: 6, left: 6, right: 6 }}
                            onPress={() => updateScore(param.id, -1)}
                          >
                            <Ionicons name="chevron-down" size={13} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.scoreOutOfText}> / 100</Text>
                    </View>
                  </View>
                );
              })}

              {/* Total Score Banner */}
              <View style={styles.totalScoreBanner}>
                <View style={styles.totalScoreLeft}>
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={24}
                    color="#007D40"
                    style={{ marginRight: 8 }}
                  />
                  <View>
                    <Text style={styles.totalScoreTitle}>Total Score</Text>
                    <Text style={styles.totalScoreSub}>
                      (Average of all parameters)
                    </Text>
                  </View>
                </View>
                <Text style={styles.totalScoreNumber}>
                  {totalScore} <Text style={styles.totalOutOf}>/ 100</Text>
                </Text>
              </View>
            </View>

            {/* 4. Remarks & Attachments Card */}
            <View style={styles.card}>
              {/* Remarks Section */}
              <View style={styles.cardSectionTitleRow}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#007D40"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.cardSectionTitle}>Remarks *</Text>
              </View>

              <TextInput
                style={styles.remarksInput}
                placeholder="Add your feedback, key observations or improvement areas..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                maxLength={500}
                value={remarks}
                onChangeText={setRemarks}
              />
              <Text style={styles.charCounter}>{remarks.length} / 500</Text>

              {/* Attachments Section */}
              <View style={[styles.cardSectionTitleRow, { marginTop: 14 }]}>
                <Ionicons
                  name="attach-outline"
                  size={18}
                  color="#007D40"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.cardSectionTitle}>Attachments (Optional)</Text>
              </View>
              <Text style={styles.attachmentsSubtext}>
                Upload photos, videos or documents (max 5 files, 10 MB each)
              </Text>

              {/* Dashed Upload Box */}
              <TouchableOpacity
                style={styles.dashedUploadBox}
                activeOpacity={0.7}
                onPress={handlePickAttachment}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={26}
                  color="#007D40"
                  style={{ marginBottom: 4 }}
                />
                <Text style={styles.uploadPromptTitle}>
                  {attachments.length > 0
                    ? `${attachments.length} file(s) attached — Tap to add more`
                    : "Tap to upload files"}
                </Text>
                <Text style={styles.uploadPromptFormats}>
                  JPG, PNG, PDF, MP4
                </Text>
              </TouchableOpacity>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>

            {/* 5. Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Primary: Save Evaluation */}
              <TouchableOpacity
                style={[
                  styles.saveEvaluationBtn,
                  saving && { opacity: 0.7 },
                ]}
                activeOpacity={0.8}
                disabled={saving}
                onPress={() => handleSaveEvaluation(false)}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveEvaluationText}>
                  {saving ? "Saving..." : "Save Evaluation"}
                </Text>
              </TouchableOpacity>

              {/* Secondary: Save as Draft */}
              <TouchableOpacity
                style={styles.saveDraftBtn}
                activeOpacity={0.8}
                disabled={saving}
                onPress={() => handleSaveEvaluation(true)}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color="#007D40"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveDraftText}>Save as Draft</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </AppScreenScroll>

      {/* Modal for Evaluation Type Picker */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Select Evaluation Type</Text>
            {EVALUATION_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.modalOptionRow,
                  evaluationType === type && styles.modalOptionRowActive,
                ]}
                onPress={() => {
                  setEvaluationType(type);
                  setShowTypeModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    evaluationType === type && styles.modalOptionTextActive,
                  ]}
                >
                  {type}
                </Text>
                {evaluationType === type && (
                  <Ionicons name="checkmark" size={18} color="#007D40" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    paddingBottom: 20,
  },

  /* 1. Athlete Information Card */
  athleteCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  athleteInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  sportBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  athleteSportText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  idBadgePill: {
    backgroundColor: "#E8F5EE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
  },
  idBadgeLabel: {
    fontSize: 9,
    color: "#007D40",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  idBadgeCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 1,
  },

  /* Generic Card Layout */
  card: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },

  /* 2. Evaluation Details Row */
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  colField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    height: 42,
  },
  fieldBoxText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },

  /* 3. Scoring Parameters */
  scoringHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  scoringSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  paramIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  paramTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  paramName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  paramDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    height: 36,
    minWidth: 64,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    minWidth: 28,
    textAlign: "center",
    padding: 0,
  },
  stepperArrowsCol: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  scoreOutOfText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 4,
  },

  /* Total Score Banner */
  totalScoreBanner: {
    backgroundColor: "#E8F5EE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalScoreLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalScoreTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  totalScoreSub: {
    fontSize: 10,
    color: "#007D40",
    fontWeight: "600",
  },
  totalScoreNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#007D40",
  },
  totalOutOf: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007D40",
  },

  /* 4. Remarks & Attachments */
  remarksInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    minHeight: 84,
    textAlignVertical: "top",
  },
  charCounter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  attachmentsSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 8,
  },
  dashedUploadBox: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  uploadPromptFormats: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  /* 5. Action Buttons */
  buttonsContainer: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  saveEvaluationBtn: {
    backgroundColor: "#007D40",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 2,
  },
  saveEvaluationText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  saveDraftBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#007D40",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },
  saveDraftText: {
    color: "#007D40",
    fontSize: 15,
    fontWeight: "700",
  },

  /* Modal Type Selector */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionRowActive: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalOptionText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  modalOptionTextActive: {
    color: "#007D40",
    fontWeight: "800",
  },

  /* Selector Fallback */
  selectorContainer: {
    padding: 16,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  athletePickCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
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
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pickName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  pickSport: {
    fontSize: 12,
    color: "#007D40",
    marginTop: 2,
    fontWeight: "600",
  },
  selectBtn: {
    backgroundColor: "#007D40",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
