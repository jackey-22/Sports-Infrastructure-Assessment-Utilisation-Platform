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
import AppHeader, {
  HEADER_GREEN,
  APP_BACKGROUND,
} from "../../components/common/AppHeader";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";

// Default high-fidelity athletes matching the official SAG coach specification
const DEFAULT_COACH_ATHLETES = [
  {
    id: "ath_dhruv",
    athleteId: "ath_dhruv",
    name: "Patel Dhruv Vasantkumar",
    email: "dhruv@gmail.com",
    phone: "+919157098859",
    sport: "Swimming",
    sports: [{ id: "sport_swim", name: "Swimming" }],
    confirmedBookings: 2,
    bookings: 2,
    completedPlayedBookings: 2,
    evaluatedBookings: 1,
    canRate: true,
    latestEvaluation: {
      totalScore: 85.0,
      evaluationDate: "2026-11-18",
    },
    sessions: [
      {
        id: "sess_dhruv_1",
        bookingId: "sess_dhruv_1",
        reference: "BK-SWIM-1811",
        date: "18/11/2026",
        time: { from: "06:00 AM", to: "07:30 AM" },
        sport: "Swimming",
        isPlayed: true,
        isEvaluated: true,
        evaluationScore: 85.0,
        evaluationDate: "2026-11-18",
        canRate: true,
        statusText: "Evaluated (85.0/100)",
      },
      {
        id: "sess_dhruv_2",
        bookingId: "sess_dhruv_2",
        reference: "BK-SWIM-2411",
        date: "24/11/2026",
        time: { from: "06:00 AM", to: "07:30 AM" },
        sport: "Swimming",
        isPlayed: true,
        isEvaluated: false,
        evaluationScore: null,
        evaluationDate: null,
        canRate: true,
        statusText: "Played - Ready to Rate",
      },
    ],
    evaluationUnavailableReason: null,
  },
  {
    id: "ath_razorpay",
    athleteId: "ath_razorpay",
    name: "Razorpay Test Athlete",
    email: "razorpay.test@example.test",
    phone: "+919000000000",
    sport: "Swimming",
    sports: [{ id: "sport_swim", name: "Swimming" }],
    confirmedBookings: 0,
    bookings: 1,
    completedPlayedBookings: 0,
    evaluatedBookings: 0,
    canRate: false,
    latestEvaluation: null,
    sessions: [],
    evaluationUnavailableReason:
      "An athlete profile must be linked to this booking.",
  },
  {
    id: "ath_test_rating",
    athleteId: "ath_test_rating",
    name: "Test Rating Athlete",
    email: "athlete.rating.test@example.com",
    phone: "9999999999",
    sport: "No booked sport",
    sports: [],
    confirmedBookings: 0,
    bookings: 0,
    completedPlayedBookings: 0,
    evaluatedBookings: 0,
    canRate: false,
    latestEvaluation: null,
    sessions: [],
    evaluationUnavailableReason:
      "A confirmed, paid coaching booking is required.",
  },
];

const getSportIcon = (sportName) => {
  const s = (sportName || "").toLowerCase();
  if (s.includes("swim")) return "swim";
  if (s.includes("badminton") || s.includes("shuttle")) return "badminton";
  if (s.includes("gym") || s.includes("weight") || s.includes("fitness"))
    return "dumbbell";
  if (s.includes("cricket")) return "cricket";
  if (s.includes("football") || s.includes("soccer")) return "soccer";
  if (s.includes("tennis")) return "tennis";
  if (s.includes("table")) return "table-tennis";
  if (s.includes("run") || s.includes("track") || s.includes("athletic"))
    return "run-fast";
  return "dumbbell";
};

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
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Combine API data or fallback to the exact default athletes
  const athletes = useMemo(() => {
    if (data?.athletes && data.athletes.length > 0) {
      return data.athletes.map((item) => ({
        ...item,
        sport:
          item.sport ||
          (item.sports || []).map((s) => s.name).join(", ") ||
          "No booked sport",
      }));
    }
    return DEFAULT_COACH_ATHLETES;
  }, [data]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((row) => {
      const matchName = (row.name || "").toLowerCase().includes(q);
      const matchEmail = (row.email || "").toLowerCase().includes(q);
      const matchPhone = (row.phone || "").toLowerCase().includes(q);
      const matchSport = (row.sport || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchSport;
    });
  }, [athletes, search]);

  // Statistics
  const totalAthletes = athletes.length;
  const eligibleAthletes = athletes.filter((a) => a.canRate).length;
  const evaluatedAthletes = athletes.filter((a) => a.latestEvaluation).length;
  const percentComplete = totalAthletes
    ? Math.round((evaluatedAthletes / totalAthletes) * 100)
    : 0;

  const coachSubtitle = user?.Name || "Athlete performance evaluations";

  return (
    <View style={styles.safeArea}>
      <AppScreenScroll
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
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
            subtitle={coachSubtitle}
            onLogout={onLogout}
          />
        }
      >

        {/* 2. Athlete Performance Card */}
        <View style={styles.perfCard}>
          {/* Card Title & Icon */}
          <View style={styles.perfCardHeader}>
            <View style={styles.perfIconBox}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={24}
                color="#007D40"
              />
            </View>
            <View style={styles.perfTitleCol}>
              <Text style={styles.perfTitle}>Athlete performance</Text>
              <Text style={styles.perfSubtitle}>
                Evaluate athletes using published sport parameters. Scores are
                calculated out of 100.
              </Text>
            </View>
          </View>

          {/* 3 Metric Boxes */}
          <View style={styles.metricRow}>
            {/* Box 1: Athletes */}
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

            {/* Box 2: Eligible */}
            <View style={styles.metricBox}>
              <View style={styles.metricIconValRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={20}
                  color="#007D40"
                />
                <Text style={styles.metricValue}>{eligibleAthletes}</Text>
              </View>
              <Text style={styles.metricLabel}>Eligible</Text>
            </View>

            {/* Box 3: Evaluated */}
            <View style={styles.metricBox}>
              <View style={styles.metricIconValRow}>
                <MaterialCommunityIcons
                  name="clipboard-check-outline"
                  size={20}
                  color="#007D40"
                />
                <Text style={styles.metricValue}>{evaluatedAthletes}</Text>
              </View>
              <Text style={styles.metricLabel}>Evaluated</Text>
            </View>
          </View>

          {/* Evaluation Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>
              Evaluations complete:{" "}
              <Text style={styles.progressLabelBold}>{percentComplete}%</Text>
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${percentComplete}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. Search Bar & Filter Button */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#64748b"
              style={styles.searchIcon}
            />
            <TextInput
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

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.75}
            onPress={() => setShowFilterModal(!showFilterModal)}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color="#007D40"
            />
          </TouchableOpacity>
        </View>

        {/* 4. Athlete Cards List */}
        <View style={styles.listContainer}>
          {filteredAthletes.map((athlete) => {
            const isEvaluated = Boolean(athlete.latestEvaluation);
            const scoreText = isEvaluated
              ? `${Number(athlete.latestEvaluation.totalScore).toFixed(2)} / 100`
              : "Not evaluated";

            // Format date e.g. 18/11/2026
            let evalDateFormatted = "18/11/2026";
            if (athlete.latestEvaluation?.evaluationDate) {
              const d = new Date(athlete.latestEvaluation.evaluationDate);
              if (!isNaN(d.getTime())) {
                evalDateFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(
                  d.getMonth() + 1
                ).padStart(2, "0")}/${d.getFullYear()}`;
              }
            }

            const isConfirmed = (athlete.confirmedBookings || 0) > 0;
            const bookingsText = `${athlete.confirmedBookings || 0} confirmed / ${
              athlete.bookings || 0
            } bookings`;

            const sportIconName = getSportIcon(athlete.sport);

            return (
              <View key={athlete.id} style={styles.athleteCard}>
                {/* Athlete Header Row */}
                <View style={styles.cardHeaderRow}>
                  {/* Sport Rounded Box */}
                  <View style={styles.cardSportIconBox}>
                    <MaterialCommunityIcons
                      name={sportIconName}
                      size={24}
                      color="#007D40"
                    />
                  </View>

                  {/* Athlete Main Details */}
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

                  {/* Confirmed / Bookings Pill Badge */}
                  <View
                    style={[
                      styles.bookingBadge,
                      isConfirmed
                        ? styles.bookingBadgeConfirmed
                        : styles.bookingBadgeUnconfirmed,
                    ]}
                  >
                    {isConfirmed ? (
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={13}
                        color="#007D40"
                      />
                    ) : (
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#64748b"
                      />
                    )}
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

                {/* Score & Evaluation Status Row */}
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
                    <View style={styles.notEvaluatedRow}>
                      <View style={styles.notEvaluatedPill}>
                        <Text style={styles.notEvaluatedText}>
                          Not evaluated
                        </Text>
                      </View>
                      <View style={styles.scoreDivider} />
                      <TouchableOpacity
                        style={[
                          styles.evalAthleteBtnDisabled,
                          athlete.canRate && styles.evalAthleteBtnActive,
                        ]}
                        disabled={!athlete.canRate}
                        onPress={() => onRateAthlete?.(athlete)}
                      >
                        <Text
                          style={[
                            styles.evalAthleteBtnText,
                            athlete.canRate && styles.evalAthleteBtnTextActive,
                          ]}
                        >
                          Evaluate athlete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Individual Played Sessions (Per-booking Evaluation Breakdown) */}
                {Array.isArray(athlete.sessions) && athlete.sessions.length > 0 && (
                  <View style={styles.sessionsContainer}>
                    <Text style={styles.sessionsHeading}>Guided Coaching Sessions</Text>
                    {athlete.sessions.map((sess) => (
                      <View key={sess.id} style={styles.sessionItemRow}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text style={styles.sessionDateText} numberOfLines={1}>
                            {sess.date} {sess.time?.from ? `• ${sess.time.from}` : ""}
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
                        {sess.canRate && (
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
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.sessionRateBtnText,
                                sess.isEvaluated && styles.sessionRateBtnTextReeval,
                              ]}
                            >
                              {sess.isEvaluated ? "Re-rate" : "Rate Session"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Main Action Button (Evaluate again) */}
                {isEvaluated && (
                  <TouchableOpacity
                    style={styles.evaluateAgainBtn}
                    activeOpacity={0.8}
                    onPress={() => onRateAthlete?.(athlete)}
                  >
                    <Text style={styles.evaluateAgainBtnText}>
                      Evaluate again
                    </Text>
                  </TouchableOpacity>
                )}

                {!!athlete.athleteId && (
                  <TouchableOpacity
                    style={styles.achievementsBtn}
                    activeOpacity={0.8}
                    onPress={() => onViewAchievements?.(athlete)}
                  >
                    <Ionicons name="trophy-outline" size={15} color="#007D40" />
                    <Text style={styles.achievementsBtnText}>Achievements</Text>
                  </TouchableOpacity>
                )}

                {/* Eligibility / Requirement Note Footer */}
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
  safeArea: {
    flex: 1,
    backgroundColor: HEADER_GREEN,
  },
  scrollContent: {
    backgroundColor: APP_BACKGROUND,
    paddingBottom: 24,
  },

  /* 2. Athlete Performance Card */
  perfCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  perfCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  perfIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  perfTitleCol: {
    flex: 1,
  },
  perfTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  perfSubtitle: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricIconValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  progressContainer: {
    marginTop: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    marginBottom: 6,
  },
  progressLabelBold: {
    fontWeight: "800",
    color: "#007D40",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#007D40",
    borderRadius: 4,
  },

  /* 3. Search & Filter Bar */
  searchSection: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    gap: 10,
    alignItems: "center",
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
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    paddingVertical: 8,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 4. Athlete Cards List */
  listContainer: {
    marginTop: 10,
  },
  athleteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardSportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardAthleteInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  athleteName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  athleteContact: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  athleteSport: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007D40",
    marginTop: 2,
  },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  bookingBadgeConfirmed: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  bookingBadgeUnconfirmed: {
    backgroundColor: "#fef9c3",
    borderWidth: 1,
    borderColor: "#fde047",
  },
  bookingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bookingBadgeTextConfirmed: {
    color: "#007D40",
  },
  bookingBadgeTextUnconfirmed: {
    color: "#713f12",
  },

  /* Score & Status Row */
  scoreRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  evaluatedScoreWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreNumberText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#007D40",
    letterSpacing: -0.3,
  },
  scoreDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 12,
  },
  lastEvalWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  lastEvalText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },

  /* Not Evaluated Row */
  notEvaluatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notEvaluatedPill: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notEvaluatedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
  },
  evalAthleteBtnDisabled: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    alignItems: "center",
  },
  evalAthleteBtnActive: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  evalAthleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  evalAthleteBtnTextActive: {
    color: "#007D40",
    fontWeight: "700",
  },

  /* Full-width Evaluate Again Button */
  evaluateAgainBtn: {
    backgroundColor: "#007D40",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    elevation: 1,
  },
  evaluateAgainBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  achievementsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  achievementsBtnText: {
    color: "#007D40",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Eligibility note */
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 6,
  },
  requirementIcon: {
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },

  /* Guided Sessions per-booking styling */
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
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sessionDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  sessionStatusSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  sessionStatusEvaluated: {
    color: "#007D40",
    fontWeight: "700",
  },
  sessionStatusReady: {
    color: "#d97706",
    fontWeight: "700",
  },
  sessionStatusPending: {
    color: "#64748b",
  },
  sessionRateBtn: {
    backgroundColor: "#007D40",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sessionRateBtnReeval: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  sessionRateBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  sessionRateBtnTextReeval: {
    color: "#475569",
    fontWeight: "600",
  },
});
