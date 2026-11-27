import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text } from "../../components/AppText";
import { Action, performanceStyles as s } from "../../components/performance/PerformanceUI";
import { api } from "../../api/client";

const GREEN = "#007D40";

export default function CitizenProfileScreen({ user, onBack, onLogout }) {
  const [sports, setSports] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([api.get("/getSports"), api.get("/api/athlete/preferences")])
      .then(([spRes, prefRes]) => {
        setSports(spRes.data || []);
        setSelectedIds((prefRes.data?.preferredSports || []).map((item) => String(item._id)));
        setNotifications(prefRes.data?.notifications || []);
      })
      .catch(() => {});
  }, []);

  const uniqueSports = useMemo(() => {
    const seen = new Map();
    sports.forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sports]);

  const toggleSport = (id) => {
    const strId = String(id);
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((item) => item !== strId) : [...prev, strId]
    );
  };

  const savePreferences = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.put("/api/athlete/preferences", { sportIds: selectedIds });
      setNotice("Sport notification preferences saved.");
    } catch (err) {
      setNotice(err.message || "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <AppScreenScroll
        contentContainerStyle={s.content}
        header={
          <AppHeader
            title="Account Profile"
            subtitle="Account details & sport notification preferences"
            onBack={onBack}
            onLogout={onLogout}
          />
        }
      >
        <View style={s.card}>
          <Text style={s.title}>{user?.Name || "Citizen / Athlete"}</Text>
          {[
            ["Email", user?.Email],
            ["Mobile", user?.ContactNum],
            ["Date of birth", user?.DOB ? new Date(user.DOB).toLocaleDateString() : ""],
          ].map(([label, value]) => (
            <View key={label}>
              <Text style={s.label}>{label}</Text>
              <Text style={s.body}>{value || "Not provided"}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.title}>Preferred Sports for Alerts</Text>
          <Text style={styles.hint}>
            Receive notifications when new slots or updates open for your selected sports.
          </Text>
          <View style={styles.chipWrap}>
            {uniqueSports.map((sp) => {
              const active = selectedIds.includes(String(sp._id));
              return (
                <TouchableOpacity
                  key={sp._id}
                  onPress={() => toggleSport(sp._id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  {active ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {sp.SportName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!notice && <Text style={styles.notice}>{notice}</Text>}
          <Action disabled={saving} onPress={savePreferences}>
            {saving ? "Saving..." : "Save Sport Preferences"}
          </Action>

          {notifications.length ? (
            <View style={styles.notifBox}>
              <Text style={styles.notifHeading}>RECENT SPORT ALERTS</Text>
              {notifications.slice(0, 4).map((n) => (
                <View key={n._id} style={styles.notifRow}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMsg}>{n.message}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Action secondary onPress={onBack}>
          Back
        </Action>
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: "#64748b", marginTop: 4, marginBottom: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  chipTextActive: { color: "#fff" },
  notice: { fontSize: 12, fontWeight: "700", color: GREEN, marginBottom: 8 },
  notifBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12 },
  notifHeading: { fontSize: 11, fontWeight: "800", color: "#64748b", marginBottom: 8 },
  notifRow: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, marginBottom: 6 },
  notifTitle: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  notifMsg: { fontSize: 11, color: "#475569", marginTop: 2 },
});
