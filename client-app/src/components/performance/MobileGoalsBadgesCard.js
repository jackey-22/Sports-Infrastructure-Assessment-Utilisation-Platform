import React, { useRef, useState } from "react";
import { Modal, Share, View, StyleSheet, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Text } from "../AppText";
import { Action, Field, performanceStyles as s } from "./PerformanceUI";

const GREEN = "#007D40";

const GOAL_TYPES = [
  { value: "attendance", label: "Attendance (check-ins)", defaultTarget: "10" },
  { value: "skill_score", label: "Evaluation Score (/100)", defaultTarget: "85" },
  { value: "custom", label: "Custom Milestone", defaultTarget: "1" },
];

export default function MobileGoalsBadgesCard({
  goalData,
  sports = [],
  athleteName = "",
  onCreateGoal,
  onCompleteGoal,
  onDeleteGoal,
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [sportId, setSportId] = useState("");
  const [goalType, setGoalType] = useState("attendance");
  const [targetValue, setTargetValue] = useState("10");
  const [shareBadge, setShareBadge] = useState(null);
  const badgeCardRef = useRef(null);

  const shareCapturedBadgeImage = async () => {
    if (!shareBadge) return;
    const msg = `🏆 ${athleteName ? `${athleteName} unlocked` : "Unlocked"} "${shareBadge.name}" (+${shareBadge.points} XP) on KhelGujarat! Rank: ${rank?.current?.name || "Bronze Athlete"} (${xpPoints} XP)`;
    try {
      if (badgeCardRef.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(badgeCardRef, { format: "png", quality: 1 });
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `${shareBadge.name} — KhelGujarat`,
        });
        return;
      }
    } catch {
      // fallback to text share below
    }
    await Share.share({ title: `${shareBadge.name} — KhelGujarat`, message: msg });
  };

  const goals = goalData?.goals || [];
  const badgeCatalog = goalData?.badgeCatalog || [];
  const xpPoints = goalData?.xpPoints || 0;
  const rank = goalData?.rank;

  const submit = async () => {
    if (!title.trim()) {
      setError("Enter a goal title.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onCreateGoal({
        title: title.trim(),
        sportId: sportId || undefined,
        goalType,
        targetValue: Number(targetValue) || 1,
      });
      setTitle("");
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Could not save goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Goals & Badges</Text>
          <Text style={styles.sub}>Track targets and unlock rank badges</Text>
        </View>
        <Action
          secondary={showForm}
          onPress={() => {
            setError("");
            setShowForm((v) => !v);
          }}
        >
          {showForm ? "Cancel" : "+ Set Goal"}
        </Action>
      </View>

      {/* Rank Banner */}
      {rank ? (
        <View style={styles.rankCard}>
          <View style={styles.rankTop}>
            <View style={styles.rankIcon}>
              <Ionicons name="ribbon" size={22} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankLabel}>CURRENT RANK</Text>
              <Text style={styles.rankName}>{rank.current?.name}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.xpVal}>{xpPoints} XP</Text>
              {rank.next ? (
                <Text style={styles.xpNext}>
                  {Math.max(0, rank.next.minPoints - xpPoints)} to {rank.next.name}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Create Goal Form */}
      {showForm ? (
        <View style={[s.card, styles.formCard]}>
          <Text style={s.title}>New training goal</Text>
          <Field label="Goal title" value={title} onChangeText={setTitle} placeholder="e.g. 10 Badminton sessions" />
          <Field label="Sport (optional)">
            <Picker selectedValue={sportId} onValueChange={setSportId}>
              <Picker.Item label="All sports" value="" />
              {sports.map((sp) => (
                <Picker.Item key={sp._id} value={String(sp._id)} label={sp.SportName} />
              ))}
            </Picker>
          </Field>
          <Field label="Tracking type">
            <Picker
              selectedValue={goalType}
              onValueChange={(val) => {
                setGoalType(val);
                const opt = GOAL_TYPES.find((g) => g.value === val);
                if (opt) setTargetValue(opt.defaultTarget);
              }}
            >
              {GOAL_TYPES.map((g) => (
                <Picker.Item key={g.value} value={g.value} label={g.label} />
              ))}
            </Picker>
          </Field>
          <Field
            label="Target value"
            keyboardType="numeric"
            value={targetValue}
            onChangeText={setTargetValue}
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Action disabled={saving} onPress={submit}>
            {saving ? "Saving..." : "Save Goal"}
          </Action>
        </View>
      ) : null}

      {/* Goals List */}
      {goals.length ? (
        goals.map((g) => {
          const target = Math.max(1, Number(g.targetValue) || 1);
          const current = Number(g.currentValue) || 0;
          const pct = Math.min(100, Math.round((current / target) * 100));
          const done = g.status === "Completed";
          return (
            <View key={g._id} style={[s.card, styles.goalCard]}>
              <View style={styles.goalTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.tagRow}>
                    {g.sport?.SportName ? (
                      <Text style={styles.sportTag}>{g.sport.SportName}</Text>
                    ) : null}
                    <Text style={[styles.statusTag, done && styles.statusDone]}>{g.status}</Text>
                  </View>
                  <Text style={styles.goalTitle}>{g.title}</Text>
                </View>
                {g.assignedByRole !== "coach" ? (
                  <TouchableOpacity onPress={() => onDeleteGoal(g._id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={17} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {current} / {target} {g.unit || ""}
                </Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: done ? "#15803d" : GREEN }]} />
              </View>
              {!done && g.goalType === "custom" ? (
                <TouchableOpacity style={styles.completeBtn} onPress={() => onCompleteGoal(g._id)}>
                  <Ionicons name="checkmark-circle" size={15} color="#fff" />
                  <Text style={styles.completeBtnText}>Mark Complete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={s.card}>
          <Text style={styles.emptyText}>No goals set yet. Tap "+ Set Goal" to start tracking.</Text>
        </View>
      )}

      {/* Badges Showcase */}
      <Text style={styles.badgeHeading}>
        Milestone Badges ({badgeCatalog.filter((b) => b.unlocked).length}/{badgeCatalog.length})
      </Text>
      <View style={styles.badgeGrid}>
        {badgeCatalog.map((b) => (
          <TouchableOpacity
            key={b.badgeKey}
            activeOpacity={b.unlocked ? 0.75 : 1}
            onPress={() => (b.unlocked ? setShareBadge(b) : null)}
            style={[styles.badgeCard, !b.unlocked && styles.badgeLocked]}
          >
            <View style={styles.badgeTop}>
              <Ionicons
                name={b.unlocked ? "medal" : "lock-closed"}
                size={18}
                color={b.unlocked ? "#d97706" : "#94a3b8"}
              />
              <Text style={styles.badgeXp}>+{b.points} XP</Text>
            </View>
            <Text style={styles.badgeName}>{b.name}</Text>
            <Text style={styles.badgeHint}>{b.unlocked ? b.description : b.hint}</Text>
            {b.unlocked ? (
              <View style={styles.sharePill}>
                <Ionicons name="share-social-outline" size={12} color={GREEN} />
                <Text style={styles.sharePillText}>Share Post</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Shareable Badge Post Modal */}
      <Modal
        visible={Boolean(shareBadge)}
        transparent
        animationType="slide"
        onRequestClose={() => setShareBadge(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Achievement Post</Text>
              <TouchableOpacity onPress={() => setShareBadge(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {shareBadge ? (
              <>
                <View ref={badgeCardRef} collapsable={false} style={styles.postPreview}>
                  <Text style={styles.postOrg}>SPORTS AUTHORITY OF GUJARAT · KHELGUJARAT</Text>
                  <View style={styles.hexOuter}>
                    <View style={styles.hexInner}>
                      <Ionicons name="star" size={30} color="#fde047" />
                    </View>
                  </View>
                  <Text style={styles.postPill}>
                    {String(shareBadge.tier || "gold").toUpperCase()} BADGE · +{shareBadge.points} XP
                  </Text>
                  <Text style={styles.postBadgeName}>{shareBadge.name}</Text>
                  <Text style={styles.postDesc}>{shareBadge.description}</Text>
                  <View style={styles.postFooter}>
                    <Text style={styles.postAthlete}>{athleteName || "KhelGujarat Athlete"}</Text>
                    <Text style={styles.postRank}>
                      {rank?.current?.name || "Bronze Athlete"} · {xpPoints} XP
                    </Text>
                  </View>
                </View>

                <View style={styles.shareActions}>
                  <TouchableOpacity style={styles.waBtn} onPress={shareCapturedBadgeImage}>
                    <Ionicons name="image-outline" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>Share Badge Image (WhatsApp / Social)</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 18, marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  sub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  rankCard: {
    backgroundColor: "#fef3c7",
    borderColor: "#fcd34d",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  rankTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffffcc",
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabel: { fontSize: 10, fontWeight: "800", color: "#92400e" },
  rankName: { fontSize: 15, fontWeight: "800", color: "#78350f" },
  xpVal: { fontSize: 16, fontWeight: "900", color: "#78350f" },
  xpNext: { fontSize: 10, color: "#92400e", fontWeight: "600" },
  formCard: { marginBottom: 12, borderColor: GREEN, borderWidth: 1 },
  goalCard: { marginBottom: 10 },
  goalTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tagRow: { flexDirection: "row", gap: 6, marginBottom: 4, flexWrap: "wrap" },
  sportTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065f46",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  statusTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  statusDone: { color: "#15803d", backgroundColor: "#dcfce7" },
  goalTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 4 },
  progressText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  barBg: { height: 7, backgroundColor: "#e2e8f0", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99 },
  completeBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#64748b", textAlign: "center", paddingVertical: 8 },
  badgeHeading: { fontSize: 14, fontWeight: "800", color: "#0f172a", marginTop: 8, marginBottom: 8 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeCard: {
    width: "48%",
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  badgeLocked: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", opacity: 0.78 },
  badgeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  badgeXp: { fontSize: 10, fontWeight: "800", color: "#92400e" },
  badgeName: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  badgeHint: { fontSize: 10, color: "#64748b", marginTop: 2 },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  sharePillText: { fontSize: 10, fontWeight: "800", color: GREEN },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  postPreview: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  postOrg: { fontSize: 10, fontWeight: "800", color: "#6ee7b7", letterSpacing: 0.6, textAlign: "center" },
  hexOuter: {
    width: 74,
    height: 74,
    borderRadius: 22,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hexInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-45deg" }],
  },
  postPill: { fontSize: 10, fontWeight: "800", color: "#6ee7b7", textAlign: "center" },
  postBadgeName: { fontSize: 18, fontWeight: "900", color: "#fff", marginTop: 4, textAlign: "center" },
  postDesc: { fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 17, textAlign: "center" },
  postFooter: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    marginTop: 14,
    paddingTop: 10,
  },
  postAthlete: { fontSize: 12, fontWeight: "800", color: "#fff" },
  postRank: { fontSize: 11, fontWeight: "600", color: "#a7f3d0" },
  shareActions: { flexDirection: "row", gap: 10 },
  waBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    borderRadius: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GREEN,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
