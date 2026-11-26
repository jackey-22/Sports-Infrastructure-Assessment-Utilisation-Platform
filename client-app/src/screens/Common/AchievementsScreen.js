import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text, TextInput } from "../../components/AppText";
import { Action, Field, ResourceState, performanceStyles as s } from "../../components/performance/PerformanceUI";
import { performanceService } from "../../services/performanceService";
import { ACHIEVEMENT_CATEGORIES, achievementPayload } from "../../utils/performance";

const localDate = (value) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

function statusTone(status) {
  if (status === "Verified") return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (status === "Rejected") return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  return { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" };
}

export default function AchievementsScreen({
  role = "coach",
  athlete = null,
  onBack,
  onLogout,
}) {
  const fixedAthleteId = athlete?.athleteId ? String(athlete.athleteId) : "";
  const [achievements, setAchievements] = useState([]);
  const [sports, setSports] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState(null); // { id, targetStatus, remarks }

  const [form, setForm] = useState({
    athleteId: fixedAthleteId,
    sportId: "",
    category: ACHIEVEMENT_CATEGORIES[0],
    title: "",
    achievementDate: localDate(new Date()),
    eventName: "",
    rank: "",
    description: "",
    verificationStatus: "Verified",
    verificationRemarks: `Recorded by ${role}`,
  });

  const patchForm = (values) => setForm((old) => ({ ...old, ...values }));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [achRows, sportRows] = await Promise.all([
        performanceService.staffAchievements(fixedAthleteId),
        performanceService.sports(),
      ]);
      setAchievements(achRows);
      setSports(sportRows);

      if (!fixedAthleteId) {
        try {
          if (role === "coach") {
            const roster = await performanceService.coachRoster();
            const list = (roster?.athletes || [])
              .filter((a) => a.athleteId)
              .map((a) => ({
                _id: String(a.athleteId),
                name: a.name,
                contact: a.email || a.phone || "",
              }));
            setAthletes(list);
          } else {
            const scoped = await performanceService.scopedAthletes();
            const list = (scoped || []).map((a) => ({
              _id: String(a._id),
              name: a.userId?.Name || "Athlete",
              contact: a.userId?.Email || a.userId?.ContactNum || "",
            }));
            setAthletes(list);
          }
        } catch {
          setAthletes([]);
        }
      }
    } catch (err) {
      setError(err.message || "Could not load achievements.");
    } finally {
      setLoading(false);
    }
  }, [fixedAthleteId, role]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: achievements.length,
      pending: achievements.filter((a) => a.verificationStatus === "Pending").length,
      verified: achievements.filter((a) => a.verificationStatus === "Verified").length,
      rejected: achievements.filter((a) => a.verificationStatus === "Rejected").length,
    }),
    [achievements]
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return achievements.filter((item) => {
      if (statusFilter !== "All" && item.verificationStatus !== statusFilter) return false;
      if (!needle) return true;
      const aName = item.athlete?.userId?.Name?.toLowerCase() || "";
      const title = item.title?.toLowerCase() || "";
      const eventName = item.eventName?.toLowerCase() || "";
      const sport = item.sport?.SportName?.toLowerCase() || "";
      return aName.includes(needle) || title.includes(needle) || eventName.includes(needle) || sport.includes(needle);
    });
  }, [achievements, statusFilter, search]);

  const submitNewAchievement = async () => {
    setError("");
    setNotice("");
    const targetAthleteId = fixedAthleteId || form.athleteId;
    if (!targetAthleteId) {
      setError("Please select an athlete.");
      return;
    }
    let payload;
    try {
      payload = achievementPayload(form);
    } catch (err) {
      setError(err.message);
      return;
    }

    setSaving(true);
    try {
      await performanceService.createStaffAchievement({
        ...payload,
        athleteId: targetAthleteId,
        verificationStatus: form.verificationStatus || "Verified",
        verificationRemarks: form.verificationRemarks || `Recorded by ${role}`,
      });
      setShowAddForm(false);
      setForm({
        athleteId: fixedAthleteId,
        sportId: "",
        category: ACHIEVEMENT_CATEGORIES[0],
        title: "",
        achievementDate: localDate(new Date()),
        eventName: "",
        rank: "",
        description: "",
        verificationStatus: "Verified",
        verificationRemarks: `Recorded by ${role}`,
      });
      setNotice("Achievement added successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add achievement.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVerification = async () => {
    if (!verifyTarget) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await performanceService.verifyAchievement(verifyTarget.id, {
        verificationStatus: verifyTarget.targetStatus,
        verificationRemarks: verifyTarget.remarks || "",
      });
      setNotice(`Achievement marked as ${verifyTarget.targetStatus}.`);
      setVerifyTarget(null);
      await load();
    } catch (err) {
      setError(err.message || "Could not update verification status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        header={
          <AppHeader
            title={athlete?.name ? `${athlete.name}'s Awards` : "Athlete Achievements"}
            subtitle={
              role === "admin"
                ? "State-wide athlete achievements & verification"
                : role === "manager"
                ? "Facility athlete achievements & awards"
                : "Review, verify, and record athlete awards"
            }
            onBack={onBack}
            onLogout={!onBack ? onLogout : undefined}
          />
        }
      >
        {/* Summary Counts */}
        <View style={localStyles.kpiGrid}>
          <View style={localStyles.kpiBox}>
            <Text style={localStyles.kpiVal}>{counts.total}</Text>
            <Text style={localStyles.kpiLbl}>Total</Text>
          </View>
          <View style={[localStyles.kpiBox, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <Text style={[localStyles.kpiVal, { color: "#b45309" }]}>{counts.pending}</Text>
            <Text style={localStyles.kpiLbl}>Pending</Text>
          </View>
          <View style={[localStyles.kpiBox, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
            <Text style={[localStyles.kpiVal, { color: "#047857" }]}>{counts.verified}</Text>
            <Text style={localStyles.kpiLbl}>Verified</Text>
          </View>
          <View style={[localStyles.kpiBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
            <Text style={[localStyles.kpiVal, { color: "#b91c1c" }]}>{counts.rejected}</Text>
            <Text style={localStyles.kpiLbl}>Rejected</Text>
          </View>
        </View>

        {!!notice && <Text style={s.notice}>{notice}</Text>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}

        {/* Add Achievement Header */}
        <View style={s.row}>
          <Action
            secondary={showAddForm}
            onPress={() => {
              setError("");
              setShowAddForm((v) => !v);
            }}
          >
            {showAddForm ? "Cancel Form" : "+ Add Achievement"}
          </Action>
          <Action secondary onPress={load}>Refresh</Action>
        </View>

        {/* Collapsible Add Achievement Form */}
        {showAddForm && (
          <View style={[s.card, localStyles.formCard]}>
            <Text style={s.title}>Record Athlete Achievement</Text>
            {!fixedAthleteId ? (
              <Field label="Select Athlete">
                <Picker
                  enabled={!saving}
                  selectedValue={form.athleteId}
                  onValueChange={(value) => patchForm({ athleteId: value })}
                >
                  <Picker.Item label="-- Choose Athlete --" value="" />
                  {athletes.map((a) => (
                    <Picker.Item
                      key={a._id}
                      value={a._id}
                      label={`${a.name}${a.contact ? ` (${a.contact})` : ""}`}
                    />
                  ))}
                </Picker>
              </Field>
            ) : (
              <Text style={s.label}>Athlete: {athlete?.name}</Text>
            )}

            <Field label="Sport">
              <Picker
                enabled={!saving}
                selectedValue={form.sportId}
                onValueChange={(value) => patchForm({ sportId: value })}
              >
                <Picker.Item label="-- Select Sport --" value="" />
                {sports.map((sport) => (
                  <Picker.Item key={sport._id} value={String(sport._id)} label={sport.SportName} />
                ))}
              </Picker>
            </Field>

            <Field label="Category">
              <Picker
                enabled={!saving}
                selectedValue={form.category}
                onValueChange={(category) => patchForm({ category })}
              >
                {ACHIEVEMENT_CATEGORIES.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </Field>

            <Field
              label="Achievement Title"
              placeholder="e.g. State Championship Gold"
              value={form.title}
              onChangeText={(title) => patchForm({ title })}
              editable={!saving}
            />

            {Platform.OS === "web" ? (
              <Field
                label="Achievement Date (YYYY-MM-DD)"
                placeholder="YYYY-MM-DD"
                value={form.achievementDate}
                onChangeText={(achievementDate) => patchForm({ achievementDate })}
                editable={!saving}
              />
            ) : (
              <Field label="Achievement Date">
                <Action secondary disabled={saving} onPress={() => setDateOpen(true)}>
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
                          patchForm({ achievementDate: localDate(date) });
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
              label="Event / Tournament"
              placeholder="e.g. National Games"
              value={form.eventName}
              onChangeText={(eventName) => patchForm({ eventName })}
              editable={!saving}
            />

            <Field
              label="Rank / Position"
              placeholder="e.g. 1st Place"
              value={form.rank}
              onChangeText={(rank) => patchForm({ rank })}
              editable={!saving}
            />

            <Field
              label="Description"
              multiline
              placeholder="Additional notes, scores, or certificate reference"
              value={form.description}
              onChangeText={(description) => patchForm({ description })}
              editable={!saving}
            />

            <Field label="Initial Status">
              <Picker
                enabled={!saving}
                selectedValue={form.verificationStatus}
                onValueChange={(verificationStatus) => patchForm({ verificationStatus })}
              >
                <Picker.Item label="Verified (Direct Approval)" value="Verified" />
                <Picker.Item label="Pending Verification" value="Pending" />
              </Picker>
            </Field>

            <Field
              label="Verification Remarks"
              value={form.verificationRemarks}
              onChangeText={(verificationRemarks) => patchForm({ verificationRemarks })}
              editable={!saving}
            />

            <View style={s.row}>
              <Action disabled={saving} onPress={submitNewAchievement}>
                {saving ? "Saving..." : "Save Achievement"}
              </Action>
              <Action secondary disabled={saving} onPress={() => setShowAddForm(false)}>
                Cancel
              </Action>
            </View>
          </View>
        )}

        {/* Filter Chips & Search */}
        <View style={localStyles.filterRow}>
          {["All", "Pending", "Verified", "Rejected"].map((status) => {
            const active = statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[localStyles.chip, active && localStyles.chipActive]}
              >
                <Text style={[localStyles.chipText, active && localStyles.chipTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          accessibilityLabel="Search achievements"
          placeholder="Search athlete, title, sport, or event..."
          value={search}
          onChangeText={setSearch}
          style={s.input}
        />

        <ResourceState
          loading={loading}
          error={error}
          onRetry={load}
          empty={!visible.length}
          emptyText="No achievements match the current filter."
        />

        {visible.map((item) => {
          const tone = statusTone(item.verificationStatus);
          const athleteUser = item.athlete?.userId;
          const complex = item.athlete?.SportComplexId;
          const editingVerification = verifyTarget?.id === item._id;

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
              <Text style={s.label}>
                {athleteUser?.Name || athlete?.name || "Athlete"}
                {athleteUser?.Email ? ` · ${athleteUser.Email}` : ""}
              </Text>
              {!!complex?.name && <Text style={s.muted}>{complex.name}</Text>}

              <Text style={s.muted}>
                {item.achievementDate ? new Date(item.achievementDate).toLocaleDateString() : ""}
                {item.eventName ? ` · ${item.eventName}` : ""}
                {item.rank ? ` (${item.rank})` : ""}
              </Text>

              {!!item.description && <Text style={s.body}>{item.description}</Text>}
              {!!item.verificationRemarks && (
                <Text style={s.muted}>Remarks: {item.verificationRemarks}</Text>
              )}

              {editingVerification ? (
                <View style={localStyles.verifyBox}>
                  <Field
                    label={`Remarks for ${verifyTarget.targetStatus}`}
                    value={verifyTarget.remarks}
                    onChangeText={(remarks) =>
                      setVerifyTarget((prev) => ({ ...prev, remarks }))
                    }
                    editable={!saving}
                  />
                  <View style={s.row}>
                    <Action disabled={saving} onPress={confirmVerification}>
                      {saving ? "Saving..." : `Confirm ${verifyTarget.targetStatus}`}
                    </Action>
                    <Action secondary disabled={saving} onPress={() => setVerifyTarget(null)}>
                      Cancel
                    </Action>
                  </View>
                </View>
              ) : (
                <View style={s.row}>
                  {item.verificationStatus !== "Verified" && (
                    <Action
                      onPress={() =>
                        setVerifyTarget({
                          id: item._id,
                          targetStatus: "Verified",
                          remarks: `Verified by ${role}`,
                        })
                      }
                    >
                      Verify
                    </Action>
                  )}
                  {item.verificationStatus !== "Rejected" && (
                    <Action
                      secondary
                      onPress={() =>
                        setVerifyTarget({
                          id: item._id,
                          targetStatus: "Rejected",
                          remarks: `Rejected by ${role}: Details unconfirmed`,
                        })
                      }
                    >
                      Reject
                    </Action>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </AppScreenScroll>
    </View>
  );
}

const localStyles = StyleSheet.create({
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  kpiLbl: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 2,
  },
  formCard: {
    borderColor: "#047857",
    borderWidth: 1.5,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  chipActive: {
    backgroundColor: "#047857",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  chipTextActive: {
    color: "#ffffff",
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
  verifyBox: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 10,
  },
});
