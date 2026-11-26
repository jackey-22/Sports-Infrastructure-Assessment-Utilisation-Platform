import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader, { APP_BACKGROUND } from "../../components/common/AppHeader";
import { ResourceState } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";

const getSportIcon = (sportName) => {
  const s = (sportName || "").toLowerCase();
  if (s.includes("swim")) return "swim";
  if (s.includes("badminton") || s.includes("shuttle")) return "badminton";
  if (s.includes("gym") || s.includes("weight") || s.includes("fitness")) return "dumbbell";
  if (s.includes("cricket")) return "cricket";
  if (s.includes("football") || s.includes("soccer")) return "soccer";
  if (s.includes("tennis")) return "tennis";
  if (s.includes("table")) return "table-tennis";
  if (s.includes("run") || s.includes("track") || s.includes("athletic")) return "run-fast";
  return "dumbbell";
};

function formatEvalDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}/${d.getFullYear()}`;
}

export default function CoachDashboardScreen({
  user,
  onLogout,
  onRateAthlete,
  onViewAchievements,
}) {
  const { data, loading, error, reload } = usePerformanceResource(
    performanceService.coachRoster
  );
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // all | pending | evaluated
  const [showFilters, setShowFilters] = useState(false);

  const athletes = useMemo(() => {
    const list = Array.isArray(data?.athletes) ? data.athletes : [];
    return list.map((item) => ({
      ...item,
      sport:
        item.sport ||
        (item.sports || []).map((s) => s.name).join(", ") ||
        "No booked sport",
    }));
  }, [data]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return athletes.filter((row) => {
      if (filterMode === "pending") {
        const hasPendingSession = (row.sessions || []).some(
          (sess) => sess.canRate && !sess.isEvaluated
        );
        if (!hasPendingSession) return false;
      } else if (filterMode === "evaluated") {
        const hasEval =
          Boolean(row.latestEvaluation) ||
          (row.sessions || []).some((sess) => sess.isEvaluated);
        if (!hasEval) return false;
      }

      if (!q) return true;
      return [row.name, row.email, row.phone, row.sport]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [athletes, search, filterMode]);

  const totalAthletes = athletes.length;
  const eligibleAthletes = athletes.filter((a) => a.canRate).length;
  const completedSessionsCount = useMemo(
    () =>
      athletes.reduce(
        (sum, row) =>
          sum + (row.sessions || []).filter((sess) => sess.canRate).length,
        0
      ),
    [athletes]
  );
  const evaluatedSessionsCount = useMemo(
    () =>
      athletes.reduce(
        (sum, row) =>
          sum + (row.sessions || []).filter((sess) => sess.isEvaluated).length,
        0
      ),
    [athletes]
  );
  const percentComplete = completedSessionsCount
    ? Math.round((evaluatedSessionsCount / completedSessionsCount) * 100)
    : totalAthletes
      ? Math.round(
          (athletes.filter((a) => a.latestEvaluation).length / totalAthletes) *
            100
        )
      : 0;

  return (
    <View style={styles.root}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
            tintColor="#007D40"
            colors={["#007D40"]}
          />
        }
        header={
          <AppHeader
            title="Coach Dashboard"
            subtitle={user?.Name || "Session performance evaluations"}
            onLogout={onLogout}
          />
        }
      >
        <View style={styles.perfCard}>
          <View style={styles.perfCardHeader}>
            <View style={styles.perfIconBox}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={24}
                color="#007D40"
              />
            </View>
            <View style={styles.perfTitleCol}>
              <Text style={styles.perfTitle}>Session Evaluations</Text>
              <Text style={styles.perfSubtitle}>
                Rate completed athlete coaching sessions using published sport
                templates.
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <View style={styles.metricIconValRow}>
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={20}
                  color="#007D40"
                />
                <Text style={styles.metricValue}>{totalAthletes}</Text>
              </View>
              <Text style={styles.metricLabel}>Athletes</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={styles.metricIconValRow}>
                <MaterialCommunityIcons
                  name="calendar-check-outline"
                  size={20}
                  color="#007D40"
                />
                <Text style={styles.metricValue}>{completedSessionsCount}</Text>
              </View>
              <Text style={styles.metricLabel}>Playable</Text>
            </View>

            <View style={styles.metricBox}>
              <View style={styles.metricIconValRow}>
                <MaterialCommunityIcons
                  name="clipboard-check-outline"
                  size={20}
                  color="#007D40"
                />
                <Text style={styles.metricValue}>{evaluatedSessionsCount}</Text>
              </View>
              <Text style={styles.metricLabel}>Rated</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>
              Sessions rated:{" "}
              <Text style={styles.progressLabelBold}>{percentComplete}%</Text>
              {eligibleAthletes > 0
                ? ` · ${eligibleAthletes} eligible athletes`
                : ""}
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarFill, { width: `${percentComplete}%` }]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.allAwardsBtn}
            activeOpacity={0.8}
            onPress={() => onViewAchievements?.(null)}
          >
            <Ionicons name="trophy-outline" size={16} color="#007D40" />
            <Text style={styles.allAwardsBtnText}>
              View All Athlete Achievements
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#64748b"
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search athletes"
              style={styles.searchInput}
              placeholder="Search name, email, phone or sport"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                style={styles.searchClearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
            activeOpacity={0.75}
            onPress={() => setShowFilters((v) => !v)}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={showFilters ? "#ffffff" : "#007D40"}
            />
          </TouchableOpacity>
        </View>

        {showFilters ? (
          <View style={styles.filterPillsRow}>
            {[
              { id: "all", label: "All Athletes" },
              { id: "pending", label: "Needs Session Rating" },
              { id: "evaluated", label: "Evaluated" },
            ].map((chip) => {
              const active = filterMode === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setFilterMode(chip.id)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <View style={styles.statePad}>
          <ResourceState
            loading={loading}
            error={error}
            onRetry={reload}
            empty={!loading && !error && filteredAthletes.length === 0}
            emptyText="No booked athletes match this filter yet."
          />
        </View>

        <View style={styles.listContainer}>
          {filteredAthletes.map((athlete) => {
            const isEvaluated = Boolean(athlete.latestEvaluation);
            const scoreText = isEvaluated
              ? `${Number(athlete.latestEvaluation.totalScore).toFixed(2)} / 100`
              : "Not evaluated";
            const evalDateFormatted = formatEvalDate(
              athlete.latestEvaluation?.evaluationDate
            );
            const isConfirmed = (athlete.confirmedBookings || 0) > 0;
            const bookingsText = `${athlete.confirmedBookings || 0} confirmed / ${
              athlete.bookings || 0
            } bookings`;
            const sessions = Array.isArray(athlete.sessions)
              ? athlete.sessions
              : [];

            return (
              <View key={athlete.id} style={styles.athleteCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardSportIconBox}>
                    <MaterialCommunityIcons
                      name={getSportIcon(athlete.sport)}
                      size={24}
                      color="#007D40"
                    />
                  </View>

                  <View style={styles.cardAthleteInfo}>
                    <Text style={styles.athleteName} numberOfLines={1}>
                      {athlete.name}
                    </Text>
                    <Text style={styles.athleteContact} numberOfLines={1}>
                      {[athlete.email, athlete.phone]
                        .filter(Boolean)
                        .join(" | ") || "Contact details unavailable"}
                    </Text>
                    <Text style={styles.athleteSport} numberOfLines={1}>
                      {athlete.sport || "No booked sport"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.bookingBadge,
                      isConfirmed
                        ? styles.bookingBadgeConfirmed
                        : styles.bookingBadgeUnconfirmed,
                    ]}
                  >
                    <Ionicons
                      name={
                        isConfirmed
                          ? "checkmark-circle-outline"
                          : "calendar-outline"
                      }
                      size={13}
                      color={isConfirmed ? "#007D40" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.bookingBadgeText,
                        isConfirmed
                          ? styles.bookingBadgeTextConfirmed
                          : styles.bookingBadgeTextUnconfirmed,
                      ]}
                    >
                      {bookingsText}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreRow}>
                  {isEvaluated ? (
                    <View style={styles.evaluatedScoreWrap}>
                      <Text style={styles.scoreNumberText}>{scoreText}</Text>
                      <View style={styles.scoreDivider} />
                      <View style={styles.lastEvalWrap}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#007D40"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.lastEvalText}>
                          Last evaluation: {evalDateFormatted}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.notEvaluatedPill}>
                      <Text style={styles.notEvaluatedText}>Not evaluated</Text>
                    </View>
                  )}
                </View>

                {sessions.length > 0 ? (
                  <View style={styles.sessionsContainer}>
                    <Text style={styles.sessionsHeading}>
                      Coaching Sessions
                    </Text>
                    {sessions.map((sess) => (
                      <View key={sess.id} style={styles.sessionItemRow}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text style={styles.sessionDateText} numberOfLines={1}>
                            {sess.sport || "Session"} · {sess.date}
                            {sess.time?.from ? ` · ${sess.time.from}` : ""}
                          </Text>
                          <Text
                            style={[
                              styles.sessionStatusSub,
                              sess.isEvaluated
                                ? styles.sessionStatusEvaluated
                                : sess.canRate
                                  ? styles.sessionStatusReady
                                  : styles.sessionStatusPending,
                            ]}
                            numberOfLines={1}
                          >
                            {sess.statusText}
                          </Text>
                        </View>
                        {sess.canRate ? (
                          <TouchableOpacity
                            style={[
                              styles.sessionRateBtn,
                              sess.isEvaluated && styles.sessionRateBtnReeval,
                            ]}
                            onPress={() =>
                              onRateAthlete?.({
                                ...athlete,
                                selectedBookingId: sess.id,
                                bookingId: sess.id,
                                selectedSportId: sess.sportId,
                                sessionSport: sess.sport,
                                sessionDate: sess.date,
                                sessionTime: sess.time,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.sessionRateBtnText,
                                sess.isEvaluated &&
                                  styles.sessionRateBtnTextReeval,
                              ]}
                            >
                              {sess.isEvaluated ? "Re-rate" : "Rate Session"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {athlete.athleteId ? (
                  <TouchableOpacity
                    style={styles.achievementsBtn}
                    activeOpacity={0.8}
                    onPress={() => onViewAchievements?.(athlete)}
                  >
                    <Ionicons name="trophy-outline" size={15} color="#007D40" />
                    <Text style={styles.achievementsBtnText}>Achievements</Text>
                  </TouchableOpacity>
                ) : null}

                {!athlete.canRate && (
                  <View style={styles.requirementRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color="#475569"
                      style={styles.requirementIcon}
                    />
                    <Text style={styles.requirementText}>
                      {athlete.evaluationUnavailableReason ||
                        (athlete.athleteId
                          ? "A confirmed, paid coaching booking is required."
                          : "An athlete profile must be linked to this booking.")}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_BACKGROUND },
  scrollContent: { backgroundColor: APP_BACKGROUND, paddingBottom: 24 },
  perfCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  perfCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  perfIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  perfTitleCol: { flex: 1 },
  perfTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 2 },
  perfSubtitle: { fontSize: 12.5, color: "#475569", lineHeight: 17 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 14 },
  metricBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricIconValRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  metricLabel: { fontSize: 11, fontWeight: "600", color: "#475569" },
  progressContainer: { marginTop: 2 },
  progressLabel: { fontSize: 12, color: "#475569", marginBottom: 6, fontWeight: "500" },
  progressLabelBold: { fontWeight: "800", color: "#007D40" },
  progressBarTrack: { height: 7, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#007D40", borderRadius: 4 },
  allAwardsBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    paddingVertical: 9,
  },
  allAwardsBtnText: { fontSize: 12.5, fontWeight: "700", color: "#007D40" },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13.5, color: "#0f172a", paddingVertical: 0 },
  searchClearBtn: { padding: 4 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: "#007D40", borderColor: "#007D40" },
  filterPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  filterPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: { borderColor: "#007D40", backgroundColor: "#ecfdf5" },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  filterPillTextActive: { color: "#007D40", fontWeight: "700" },
  statePad: { paddingHorizontal: 16 },
  listContainer: { paddingHorizontal: 16 },
  athleteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start" },
  cardSportIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardAthleteInfo: { flex: 1, paddingRight: 8 },
  athleteName: { fontSize: 15.5, fontWeight: "800", color: "#0f172a", marginBottom: 2 },
  athleteContact: { fontSize: 11.5, color: "#64748b", marginBottom: 3 },
  athleteSport: { fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    maxWidth: 155,
  },
  bookingBadgeConfirmed: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  bookingBadgeUnconfirmed: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  bookingBadgeText: { fontSize: 10.5, fontWeight: "700" },
  bookingBadgeTextConfirmed: { color: "#007D40" },
  bookingBadgeTextUnconfirmed: { color: "#475569" },
  scoreRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  evaluatedScoreWrap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  scoreNumberText: { fontSize: 14, fontWeight: "800", color: "#007D40" },
  scoreDivider: { width: 1, height: 14, backgroundColor: "#cbd5e1", marginHorizontal: 10 },
  lastEvalWrap: { flexDirection: "row", alignItems: "center" },
  lastEvalText: { fontSize: 12, color: "#475569", fontWeight: "500" },
  notEvaluatedPill: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notEvaluatedText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  sessionsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sessionsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sessionItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sessionDateText: { fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  sessionStatusSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  sessionStatusEvaluated: { color: "#007D40" },
  sessionStatusReady: { color: "#d97706" },
  sessionStatusPending: { color: "#64748b" },
  sessionRateBtn: {
    backgroundColor: "#007D40",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  sessionRateBtnReeval: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  sessionRateBtnText: { color: "#ffffff", fontSize: 11.5, fontWeight: "700" },
  sessionRateBtnTextReeval: { color: "#334155" },
  achievementsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 8,
  },
  achievementsBtnText: { color: "#007D40", fontSize: 12.5, fontWeight: "700" },
  requirementRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  requirementIcon: { marginRight: 6 },
  requirementText: { fontSize: 12, color: "#475569", flex: 1, lineHeight: 16 },
});
