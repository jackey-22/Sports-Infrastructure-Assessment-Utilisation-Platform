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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function todayString() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function CoachDashboardScreen({
  user,
  onLogout,
  onRateAthlete,
  onViewAchievements,
}) {
  const { data, loading, error, reload } = usePerformanceResource(
    performanceService.coachOverview
  );

  const [section, setSection] = useState("overview"); // overview | bookings | athletes
  const [bookingScope, setBookingScope] = useState("all"); // all | upcoming
  const [bookingSearch, setBookingSearch] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteFilter, setAthleteFilter] = useState("all"); // all | pending | evaluated

  const dashboard = data?.dashboard || null;
  const kpis = dashboard?.kpis || {};
  const facility = dashboard?.facility || null;
  const trend = Array.isArray(dashboard?.trend) ? dashboard.trend : [];
  const sportStats = Array.isArray(dashboard?.sportStats) ? dashboard.sportStats : [];
  const assignedSlots = Array.isArray(dashboard?.assignedSlots) ? dashboard.assignedSlots : [];
  const recentBookings = Array.isArray(dashboard?.recentBookings) ? dashboard.recentBookings : [];
  const breakdown = dashboard?.evaluationBreakdown || {
    evaluated: 0,
    readyToEvaluate: 0,
    upcoming: 0,
  };

  const allBookingRows = Array.isArray(data?.report?.rows) ? data.report.rows : [];

  const filteredBookings = useMemo(() => {
    const today = todayString();
    const needle = bookingSearch.trim().toLowerCase();
    return allBookingRows.filter((row) => {
      if (bookingScope === "upcoming" && String(row.date || "") < today) {
        return false;
      }
      if (!needle) return true;
      return [row.bookingReference, row.athlete, row.email, row.phone, row.sport, row.facility]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(needle));
    });
  }, [allBookingRows, bookingScope, bookingSearch]);

  const athletes = useMemo(() => {
    const list = Array.isArray(data?.roster?.athletes) ? data.roster.athletes : [];
    return list.map((item) => ({
      ...item,
      sport:
        item.sport ||
        (item.sports || []).map((s) => s.name).join(", ") ||
        "Sport",
    }));
  }, [data]);

  const filteredAthletes = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase();
    return athletes.filter((row) => {
      if (athleteFilter === "pending") {
        const hasPendingSession = (row.sessions || []).some(
          (sess) => sess.canRate && !sess.isEvaluated
        );
        if (!hasPendingSession) return false;
      } else if (athleteFilter === "evaluated") {
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
  }, [athletes, athleteSearch, athleteFilter]);

  const maxTrendValue = useMemo(
    () => Math.max(1, ...trend.flatMap((m) => [m.bookings || 0, m.evaluations || 0])),
    [trend]
  );
  const maxSportBookings = useMemo(
    () => Math.max(1, ...sportStats.map((s) => s.bookings || 0)),
    [sportStats]
  );
  const totalBreakdown =
    (breakdown.evaluated || 0) +
    (breakdown.readyToEvaluate || 0) +
    (breakdown.upcoming || 0);

  const headerSubtitle = facility?.name
    ? `${facility.name}${facility.district ? ` · ${facility.district}` : ""}`
    : user?.Name || "Coaching & Athlete Evaluations";

  const kpiCards = [
    {
      key: "bookings-all",
      label: "Coaching Bookings",
      value: kpis.bookings ?? 0,
      caption: "Confirmed under you",
      icon: "calendar-check-outline",
      accent: "#007D40",
      bg: "#ecfdf5",
      active: section === "bookings" && bookingScope === "all",
      onPress: () => {
        setBookingScope("all");
        setSection("bookings");
      },
    },
    {
      key: "bookings-upcoming",
      label: "Upcoming Sessions",
      value: kpis.upcomingBookings ?? 0,
      caption: `${kpis.todayBookings ?? 0} scheduled today`,
      icon: "clock-outline",
      accent: "#d97706",
      bg: "#fffbeb",
      active: section === "bookings" && bookingScope === "upcoming",
      onPress: () => {
        setBookingScope("upcoming");
        setSection("bookings");
      },
    },
    {
      key: "athletes",
      label: "Coaching Athletes",
      value: kpis.uniqueAthletes ?? athletes.length,
      caption: "Confirmed athletes",
      icon: "account-group-outline",
      accent: "#6d28d9",
      bg: "#f5f3ff",
      active: section === "athletes" && athleteFilter === "all",
      onPress: () => {
        setAthleteFilter("all");
        setSection("athletes");
      },
    },
    {
      key: "evaluations",
      label: "Evaluations",
      value: kpis.evaluationsCount ?? 0,
      caption: "Submitted reports",
      icon: "clipboard-check-outline",
      accent: "#b45309",
      bg: "#fef3c7",
      active: section === "athletes" && athleteFilter === "evaluated",
      onPress: () => {
        setAthleteFilter("evaluated");
        setSection("athletes");
      },
    },
    {
      key: "slots",
      label: "Assigned Slots",
      value: kpis.coachingSlots ?? assignedSlots.length,
      caption: "Facility coaching slots",
      icon: "calendar-clock",
      accent: "#0369a1",
      bg: "#f0f9ff",
      active: section === "overview",
      onPress: () => setSection("overview"),
    },
  ];

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
            subtitle={headerSubtitle}
            onLogout={onLogout}
          />
        }
      >
        <View style={styles.kpiGrid}>
          {kpiCards.map((card) => (
            <TouchableOpacity
              key={card.key}
              activeOpacity={0.8}
              onPress={card.onPress}
              style={[
                styles.kpiCard,
                card.active && styles.kpiCardActive,
              ]}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: card.bg }]}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={18}
                    color={card.accent}
                  />
                </View>
                <Text style={styles.kpiValue}>{card.value}</Text>
              </View>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {card.label}
              </Text>
              <Text style={styles.kpiCaption} numberOfLines={1}>
                {card.caption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabRow}>
          {[
            { id: "overview", label: "Overview" },
            { id: "bookings", label: `Bookings (${allBookingRows.length})` },
            { id: "athletes", label: `Athletes (${athletes.length})` },
          ].map((tab) => {
            const active = section === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSection(tab.id)}
                style={[styles.tabPill, active && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    active && styles.tabPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statePad}>
          <ResourceState
            loading={loading && !data}
            error={error}
            onRetry={reload}
          />
        </View>

        {data && section === "overview" ? (
          <View style={styles.sectionStack}>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Coaching Bookings &amp; Evaluations</Text>
              <Text style={styles.panelSubtitle}>
                Monthly confirmed bookings under your slots vs submitted evaluations
              </Text>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#007D40" }]} />
                  <Text style={styles.legendText}>Confirmed Bookings</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.legendText}>Evaluations</Text>
                </View>
              </View>

              {trend.length > 0 ? (
                <View style={styles.chartColumns}>
                  {trend.map((month) => {
                    const bookingH = Math.max(
                      4,
                      Math.round(((month.bookings || 0) / maxTrendValue) * 90)
                    );
                    const evalH = Math.max(
                      4,
                      Math.round(((month.evaluations || 0) / maxTrendValue) * 90)
                    );
                    return (
                      <View key={month.key} style={styles.chartColItem}>
                        <View style={styles.chartBarsPair}>
                          <View style={styles.chartBarWrap}>
                            <Text style={styles.chartBarVal}>{month.bookings || 0}</Text>
                            <View
                              style={[
                                styles.chartBar,
                                { height: bookingH, backgroundColor: "#007D40" },
                              ]}
                            />
                          </View>
                          <View style={styles.chartBarWrap}>
                            <Text style={styles.chartBarVal}>{month.evaluations || 0}</Text>
                            <View
                              style={[
                                styles.chartBar,
                                { height: evalH, backgroundColor: "#F59E0B" },
                              ]}
                            />
                          </View>
                        </View>
                        <Text style={styles.chartColLabel}>{month.label}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyInline}>No monthly trend data yet.</Text>
              )}
            </View>

            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Session Evaluation Breakdown</Text>
              <Text style={styles.panelSubtitle}>
                Status of confirmed coaching sessions under your slots
              </Text>

              {totalBreakdown > 0 ? (
                <>
                  <View style={styles.segmentedTrack}>
                    {breakdown.evaluated > 0 ? (
                      <View
                        style={[
                          styles.segmentedSlice,
                          { flex: breakdown.evaluated, backgroundColor: "#007D40" },
                        ]}
                      />
                    ) : null}
                    {breakdown.readyToEvaluate > 0 ? (
                      <View
                        style={[
                          styles.segmentedSlice,
                          { flex: breakdown.readyToEvaluate, backgroundColor: "#F59E0B" },
                        ]}
                      />
                    ) : null}
                    {breakdown.upcoming > 0 ? (
                      <View
                        style={[
                          styles.segmentedSlice,
                          { flex: breakdown.upcoming, backgroundColor: "#0EA5E9" },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.breakdownRow}>
                    <TouchableOpacity
                      style={styles.breakdownStat}
                      onPress={() => {
                        setAthleteFilter("evaluated");
                        setSection("athletes");
                      }}
                    >
                      <Text style={[styles.breakdownNum, { color: "#007D40" }]}>
                        {breakdown.evaluated}
                      </Text>
                      <Text style={styles.breakdownLabel}>Evaluated</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.breakdownStat}
                      onPress={() => {
                        setAthleteFilter("pending");
                        setSection("athletes");
                      }}
                    >
                      <Text style={[styles.breakdownNum, { color: "#D97706" }]}>
                        {breakdown.readyToEvaluate}
                      </Text>
                      <Text style={styles.breakdownLabel}>Ready to Evaluate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.breakdownStat}
                      onPress={() => {
                        setBookingScope("upcoming");
                        setSection("bookings");
                      }}
                    >
                      <Text style={[styles.breakdownNum, { color: "#0284C7" }]}>
                        {breakdown.upcoming}
                      </Text>
                      <Text style={styles.breakdownLabel}>Upcoming</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyInline}>No confirmed coaching sessions yet.</Text>
              )}
            </View>

            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Bookings by Sport</Text>
              <Text style={styles.panelSubtitle}>
                Confirmed bookings across your coaching sports
              </Text>
              {sportStats.length > 0 ? (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {sportStats.map((item) => {
                    const pct = Math.max(
                      8,
                      Math.round(((item.bookings || 0) / maxSportBookings) * 100)
                    );
                    return (
                      <View key={item.sport}>
                        <View style={styles.sportStatHead}>
                          <Text style={styles.sportStatName}>{item.sport}</Text>
                          <Text style={styles.sportStatMeta}>
                            {item.bookings} total · {item.upcoming} upcoming
                          </Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyInline}>No sport activity recorded yet.</Text>
              )}
            </View>

            <View style={styles.panelCard}>
              <View style={styles.panelHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Assigned Coaching Slots</Text>
                  <Text style={styles.panelSubtitle}>
                    Slots mapped to you by the Facility Manager
                  </Text>
                </View>
              </View>
              {assignedSlots.length > 0 ? (
                assignedSlots.map((slot) => (
                  <View key={slot.id} style={styles.slotRow}>
                    <View style={styles.slotTop}>
                      <Text style={styles.slotSport}>{slot.sport}</Text>
                      <Text style={styles.slotTime}>
                        {slot.startTime}–{slot.endTime}
                      </Text>
                    </View>
                    <Text style={styles.slotMeta}>
                      {slot.label} · Capacity {slot.capacity}
                    </Text>
                    <Text style={styles.slotDays}>
                      {(slot.days || []).join(", ") || "Days not configured"} · {slot.audience}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInline}>No coaching slots assigned yet.</Text>
              )}
            </View>

            <View style={styles.panelCard}>
              <View style={styles.panelHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Recent Confirmed Bookings</Text>
                  <Text style={styles.panelSubtitle}>
                    Latest confirmed coaching sessions under your slots
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSection("bookings")}>
                  <Text style={styles.linkText}>View all</Text>
                </TouchableOpacity>
              </View>
              {recentBookings.length > 0 ? (
                recentBookings.map((row) => (
                  <View key={row.id} style={styles.bookingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookingAthlete}>{row.athlete}</Text>
                      <Text style={styles.bookingSub}>
                        {row.sport} · {formatDate(row.date)} · {row.time?.from || "—"}–
                        {row.time?.to || "—"}
                      </Text>
                      <Text style={styles.bookingRef}>{row.reference}</Text>
                    </View>
                    <View style={styles.membersBadge}>
                      <Text style={styles.membersBadgeText}>
                        {row.members || 1} {row.members === 1 ? "member" : "members"}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInline}>
                  No confirmed coaching bookings yet.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.allAwardsBtn}
              activeOpacity={0.8}
              onPress={() => onViewAchievements?.(null)}
            >
              <Ionicons name="trophy-outline" size={16} color="#007D40" />
              <Text style={styles.allAwardsBtnText}>
                View Athlete Achievements
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {data && section === "bookings" ? (
          <View style={styles.sectionStack}>
            <View style={styles.searchSection}>
              <View style={styles.searchInputWrap}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color="#64748b"
                  style={styles.searchIcon}
                />
                <TextInput
                  accessibilityLabel="Search coaching bookings"
                  style={styles.searchInput}
                  placeholder="Search reference, athlete, sport or contact"
                  placeholderTextColor="#94a3b8"
                  value={bookingSearch}
                  onChangeText={setBookingSearch}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.filterPillsRow}>
              {[
                { id: "all", label: "All Confirmed" },
                { id: "upcoming", label: "Upcoming Only" },
              ].map((chip) => {
                const active = bookingScope === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setBookingScope(chip.id)}
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

            {filteredBookings.length > 0 ? (
              filteredBookings.map((row) => (
                <View key={row.id} style={styles.athleteCard}>
                  <View style={styles.bookingTopBar}>
                    <Text style={styles.bookingRefLarge}>{row.bookingReference}</Text>
                    <View style={styles.membersBadge}>
                      <Text style={styles.membersBadgeText}>
                        {row.members || 1} {row.members === 1 ? "member" : "members"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.athleteName}>{row.athlete}</Text>
                  <Text style={styles.athleteContact}>
                    {[row.email, row.phone].filter(Boolean).join(" · ") || "No contact"}
                  </Text>
                  <Text style={styles.bookingDetailLine}>
                    {row.facility} · {row.sport}
                  </Text>
                  <Text style={styles.bookingScheduleLine}>
                    {formatDate(row.date)} · {row.time?.from || "—"}–{row.time?.to || "—"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.panelCard}>
                <Text style={styles.emptyInline}>
                  No confirmed coaching bookings match this filter.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {data && section === "athletes" ? (
          <View style={styles.sectionStack}>
            <Text style={styles.singleLineSummary}>
              <Text style={styles.singleLineSummaryCount}>
                {data?.roster?.summary?.confirmedAthletes ?? athletes.length}
              </Text>{" "}
              confirmed{" "}
              {(data?.roster?.summary?.confirmedAthletes ?? athletes.length) === 1
                ? "athlete"
                : "athletes"}{" "}
              under your coaching
            </Text>

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
                  value={athleteSearch}
                  onChangeText={setAthleteSearch}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.filterPillsRow}>
              {[
                { id: "all", label: "All Athletes" },
                { id: "pending", label: "Ready to Rate" },
                { id: "evaluated", label: "Evaluated" },
              ].map((chip) => {
                const active = athleteFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setAthleteFilter(chip.id)}
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

            {filteredAthletes.length > 0 ? (
              filteredAthletes.map((athlete) => {
                const isEvaluated = Boolean(athlete.latestEvaluation);
                const scoreText = isEvaluated
                  ? `${Number(athlete.latestEvaluation.totalScore).toFixed(2)} / 100`
                  : "Not evaluated";
                const sessions = Array.isArray(athlete.sessions) ? athlete.sessions : [];

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
                          {[athlete.email, athlete.phone].filter(Boolean).join(" · ") ||
                            "Contact unavailable"}
                        </Text>
                        <Text style={styles.athleteSport} numberOfLines={1}>
                          {athlete.sport}
                        </Text>
                      </View>
                      <View style={styles.bookingBadge}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={13}
                          color="#007D40"
                        />
                        <Text style={styles.bookingBadgeText}>
                          {athlete.confirmedBookings || 0} confirmed
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scoreRow}>
                      {isEvaluated ? (
                        <View style={styles.evaluatedScoreWrap}>
                          <Text style={styles.scoreNumberText}>{scoreText}</Text>
                          <View style={styles.scoreDivider} />
                          <Text style={styles.lastEvalText}>
                            Last evaluation: {formatDate(athlete.latestEvaluation?.evaluationDate)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.notEvaluatedPill}>
                          <Text style={styles.notEvaluatedText}>Not evaluated</Text>
                        </View>
                      )}
                    </View>

                    {sessions.length > 0 ? (
                      <View style={styles.sessionsContainer}>
                        <Text style={styles.sessionsHeading}>Coaching Sessions</Text>
                        {sessions.map((sess) => (
                          <View key={sess.id} style={styles.sessionItemRow}>
                            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <Text style={styles.sessionDateText} numberOfLines={1}>
                                {sess.sport || "Session"} · {formatDate(sess.date)}
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
                                    sess.isEvaluated && styles.sessionRateBtnTextReeval,
                                  ]}
                                >
                                  {sess.isEvaluated ? "Update Score" : "Evaluate Session"}
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
                  </View>
                );
              })
            ) : (
              <View style={styles.panelCard}>
                <Text style={styles.emptyInline}>
                  No confirmed athletes match this filter yet.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 28 }} />
      </AppScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_BACKGROUND },
  scrollContent: { backgroundColor: APP_BACKGROUND, paddingBottom: 24 },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  kpiCard: {
    width: "48.4%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  kpiCardActive: {
    borderColor: "#007D40",
    backgroundColor: "#f8fffb",
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  kpiLabel: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  kpiCaption: { fontSize: 11, color: "#64748b", marginTop: 2 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  tabPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  tabPillActive: {
    backgroundColor: "#007D40",
    borderColor: "#007D40",
  },
  tabPillText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  tabPillTextActive: { color: "#ffffff" },
  statePad: { paddingHorizontal: 16 },
  sectionStack: { paddingHorizontal: 16, gap: 12, marginTop: 6 },
  panelCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  panelHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  panelTitle: { fontSize: 15.5, fontWeight: "800", color: "#0f172a" },
  panelSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  linkText: { fontSize: 12.5, fontWeight: "700", color: "#007D40" },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 12, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11.5, fontWeight: "600", color: "#475569" },
  chartColumns: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 132,
    paddingTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  chartColItem: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  chartBarsPair: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  chartBarWrap: { alignItems: "center", justifyContent: "flex-end" },
  chartBarVal: { fontSize: 10, fontWeight: "700", color: "#475569", marginBottom: 2 },
  chartBar: { width: 10, borderRadius: 4 },
  chartColLabel: { fontSize: 10, fontWeight: "600", color: "#64748b", marginTop: 6 },
  segmentedTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
    marginTop: 12,
    gap: 2,
  },
  segmentedSlice: { height: "100%" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  breakdownStat: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  breakdownNum: { fontSize: 18, fontWeight: "800" },
  breakdownLabel: { fontSize: 10.5, fontWeight: "600", color: "#475569", marginTop: 2, textAlign: "center" },
  sportStatHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sportStatName: { fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  sportStatMeta: { fontSize: 11.5, fontWeight: "600", color: "#007D40" },
  progressBarTrack: { height: 7, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#007D40", borderRadius: 4 },
  slotRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  slotTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slotSport: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  slotTime: { fontSize: 12, fontWeight: "700", color: "#007D40", backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  slotMeta: { fontSize: 12, color: "#475569", marginTop: 3 },
  slotDays: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  bookingAthlete: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  bookingSub: { fontSize: 12, color: "#475569", marginTop: 2 },
  bookingRef: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginTop: 2 },
  membersBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  membersBadgeText: { fontSize: 11, fontWeight: "700", color: "#007D40" },
  emptyInline: { fontSize: 12.5, color: "#64748b", marginTop: 10 },
  allAwardsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    paddingVertical: 11,
  },
  allAwardsBtnText: { fontSize: 13, fontWeight: "700", color: "#007D40" },
  singleLineSummary: { fontSize: 13, fontWeight: "600", color: "#475569", paddingHorizontal: 2 },
  singleLineSummaryCount: { fontWeight: "800", color: "#007D40" },
  searchSection: { flexDirection: "row", alignItems: "center" },
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
  filterPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  athleteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bookingTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  bookingRefLarge: { fontSize: 12, fontWeight: "800", color: "#475569" },
  bookingDetailLine: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginTop: 6 },
  bookingScheduleLine: { fontSize: 12, color: "#475569", marginTop: 2 },
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
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  bookingBadgeText: { fontSize: 10.5, fontWeight: "700", color: "#007D40" },
  scoreRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  evaluatedScoreWrap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  scoreNumberText: { fontSize: 14, fontWeight: "800", color: "#007D40" },
  scoreDivider: { width: 1, height: 14, backgroundColor: "#cbd5e1", marginHorizontal: 10 },
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
  sessionsContainer: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
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
});
