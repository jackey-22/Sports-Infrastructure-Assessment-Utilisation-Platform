import React, { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text } from "../../components/AppText";
import { Action, Field, performanceStyles as s } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";

const GREEN = "#007D40";

export default function CoachGoalsScreen({ onBack }) {
  const goalsRes = usePerformanceResource(performanceService.coachGoals);
  const data = goalsRes.data || { athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } };

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [athleteId, setAthleteId] = useState("");
  const [sportId, setSportId] = useState("");
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("skill_score");
  const [targetValue, setTargetValue] = useState("85");

  useEffect(() => {
    if (data.athletes?.length && !athleteId) {
      const first = data.athletes[0];
      setAthleteId(first.id);
      setSportId(first.sports?.[0]?.id || "");
    }
  }, [data.athletes, athleteId]);

  const selectedAthlete = useMemo(
    () => (data.athletes || []).find((a) => a.id === athleteId) || data.athletes?.[0] || null,
    [data.athletes, athleteId]
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return data.goals || [];
    return (data.goals || []).filter((g) => String(g.status || "").toLowerCase() === statusFilter);
  }, [data.goals, statusFilter]);

  const assign = async () => {
    if (!athleteId || !title.trim()) {
      setError("Select an athlete and enter a goal title.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await performanceService.coachAssignGoal(athleteId, {
        sportId: sportId || undefined,
        title: title.trim(),
        goalType,
        targetValue: Number(targetValue) || 1,
      });
      setTitle("");
      setShowForm(false);
      await goalsRes.reload();
    } catch (err) {
      setError(err.message || "Could not assign goal");
    } finally {
      setSaving(false);
    }
  };

  const { summary } = data;

  return (
    <View style={styles.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            tintColor={GREEN}
            colors={[GREEN]}
            refreshing={goalsRes.loading}
            onRefresh={goalsRes.reload}
          />
        }
        header={
          <AppHeader
            title="Athlete Goals"
            subtitle="Assign targets and monitor progress"
            onBack={onBack}
          />
        }
      >
        <View style={styles.kpiRow}>
          {[
            { label: "Total", value: summary?.total || 0 },
            { label: "Active", value: summary?.active || 0 },
            { label: "Done", value: summary?.completed || 0 },
            { label: "Overdue", value: summary?.overdue || 0 },
          ].map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.topActions}>
          <Action
            secondary={showForm}
            disabled={!data.athletes?.length}
            onPress={() => {
              setError("");
              setShowForm((v) => !v);
            }}
          >
            {showForm ? "Cancel" : "+ Assign Goal"}
          </Action>
        </View>

        {showForm ? (
          <View style={[s.card, styles.formCard]}>
            <Text style={s.title}>Assign goal to athlete</Text>
            <Field label="Athlete">
              <Picker
                selectedValue={athleteId}
                onValueChange={(val) => {
                  setAthleteId(val);
                  const ath = (data.athletes || []).find((a) => a.id === val);
                  setSportId(ath?.sports?.[0]?.id || "");
                }}
              >
                {(data.athletes || []).map((a) => (
                  <Picker.Item key={a.id} value={a.id} label={a.name} />
                ))}
              </Picker>
            </Field>
            <Field label="Sport">
              <Picker selectedValue={sportId} onValueChange={setSportId}>
                {(selectedAthlete?.sports || []).map((sp) => (
                  <Picker.Item key={sp.id} value={sp.id} label={sp.name} />
                ))}
              </Picker>
            </Field>
            <Field label="Goal title" value={title} onChangeText={setTitle} placeholder="e.g. Reach 85/100 score" />
            <Field label="Tracking type">
              <Picker
                selectedValue={goalType}
                onValueChange={(val) => {
                  setGoalType(val);
                  setTargetValue(val === "skill_score" ? "85" : val === "attendance" ? "8" : "1");
                }}
              >
                <Picker.Item label="Evaluation Score (/100)" value="skill_score" />
                <Picker.Item label="Attendance Sessions" value="attendance" />
                <Picker.Item label="Custom Milestone" value="custom" />
              </Picker>
            </Field>
            <Field label="Target value" keyboardType="numeric" value={targetValue} onChangeText={setTargetValue} />
            {!!error && <Text style={s.error}>{error}</Text>}
            <Action disabled={saving} onPress={assign}>
              {saving ? "Assigning..." : "Assign Goal"}
            </Action>
          </View>
        ) : null}

        <View style={styles.chipRow}>
          {["all", "active", "completed", "overdue"].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.chip, statusFilter === st && styles.chipActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length ? (
          filtered.map((g) => {
            const target = Math.max(1, Number(g.targetValue) || 1);
            const current = Number(g.currentValue) || 0;
            const pct = Math.min(100, Math.round((current / target) * 100));
            return (
              <View key={`${g.athleteId}-${g._id}`} style={[s.card, styles.goalCard]}>
                <View style={styles.metaRow}>
                  <Text style={styles.athleteName}>{g.athleteName}</Text>
                  <Text style={styles.sportBadge}>{g.sportName}</Text>
                </View>
                <Text style={styles.goalTitle}>{g.title}</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {current} / {target} {g.unit} ({g.status})
                  </Text>
                  <Text style={styles.progressPct}>{pct}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })
        ) : (
          <View style={s.card}>
            <Text style={styles.empty}>No goals in this view.</Text>
          </View>
        )}
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  kpiRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  kpiVal: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  kpiLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 2 },
  topActions: { marginBottom: 12 },
  formCard: { marginBottom: 12, borderColor: GREEN, borderWidth: 1 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  chipTextActive: { color: "#fff" },
  goalCard: { marginBottom: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  athleteName: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  sportBadge: { fontSize: 11, fontWeight: "700", color: GREEN, backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  goalTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 4 },
  progressText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  barBg: { height: 7, backgroundColor: "#e2e8f0", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: GREEN, borderRadius: 99 },
  empty: { textAlign: "center", color: "#64748b", fontSize: 13, paddingVertical: 12 },
});
