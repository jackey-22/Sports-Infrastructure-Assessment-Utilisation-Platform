import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useMemo, useRef, useState } from "react";
import { View, RefreshControl, Platform, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text } from "../../components/AppText";
import { Action, Field, ResourceState, EvaluationCard, performanceStyles as s } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import { ACHIEVEMENT_CATEGORIES, achievementPayload } from "../../utils/performance";

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

export default function AthletePerformanceScreen({ onBack, onProfile }) {
  const evaluations = usePerformanceResource(performanceService.ownEvaluations);
  const achievements = usePerformanceResource(performanceService.achievements);
  const sports = usePerformanceResource(performanceService.sports);

  const [sportId, setSportId] = useState("");
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

  const visible = useMemo(
    () => (evaluations.data || []).filter((item) => !sportId || String(item.sport?._id || item.sport) === sportId),
    [evaluations.data, sportId]
  );

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
    <View style={s.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={evaluations.loading || achievements.loading || sports.loading}
            onRefresh={refresh}
          />
        }
        header={
          <AppHeader
            title="Performance & Achievements"
            subtitle="Sport-wise evaluations and verified achievements"
            onBack={onBack}
          />
        }
      >
        <View style={s.row}>
          <Action secondary onPress={onProfile}>Account profile</Action>
          <Action secondary onPress={refresh}>Refresh performance</Action>
        </View>

        {!!notice && <Text style={s.notice}>{notice}</Text>}
        {noProfile && (
          <Text style={s.notice}>
            Your account does not have a linked athlete profile yet. Evaluations and achievement submission become available once it is linked.
          </Text>
        )}

        <View style={s.card}>
          <Field label="Filter evaluations by sport">
            <Picker selectedValue={sportId} onValueChange={setSportId}>
              <Picker.Item label="All sports" value="" />
              {(sports.data || []).map((sport) => (
                <Picker.Item key={sport._id} value={String(sport._id)} label={sport.SportName} />
              ))}
            </Picker>
          </Field>
        </View>

        <ResourceState loading={sports.loading} error={sports.error} onRetry={sports.reload} />
        <Text style={s.title}>Evaluation history</Text>
        <ResourceState
          loading={evaluations.loading}
          error={evaluations.error}
          onRetry={evaluations.reload}
          empty={!visible.length}
          emptyText="No evaluations yet. Your coach's saved evaluations will appear here."
        />
        {visible.map((evaluation) => (
          <EvaluationCard key={evaluation._id} evaluation={evaluation} />
        ))}

        {/* Achievements Header + Toggle Button */}
        <View style={localStyles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Achievements</Text>
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
            {showForm ? "Cancel" : "+ Submit achievement"}
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
                {(sports.data || []).map((sport) => (
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
                disabled={saving || noProfile || !sports.data?.length || evaluations.loading}
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

        {/* Submitted Achievements Below */}
        <Text style={s.label}>
          Submitted achievements ({(achievements.data || []).length})
        </Text>
        <ResourceState
          loading={achievements.loading}
          error={achievements.error}
          onRetry={achievements.reload}
          empty={!achievements.data?.length}
          emptyText="No achievements submitted yet. Tap '+ Submit achievement' above to record one."
        />
        {(achievements.data || []).map((item) => {
          const tone = statusTone(item.verificationStatus);
          return (
            <View key={item._id} style={s.card}>
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
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.muted}>
                {item.achievementDate ? new Date(item.achievementDate).toLocaleDateString() : ""}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  formCard: {
    borderColor: "#047857",
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
    fontSize: 11,
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
});
