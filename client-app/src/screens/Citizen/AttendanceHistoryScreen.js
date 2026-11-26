import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import { Text } from "../../components/AppText";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BookingPassCard from "../../components/qr/BookingPassCard";
import { api } from "../../api/client";
import { citizenService } from "../../services/citizen/citizenService";

const GREEN = "#007D40";

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function monthLabel(ym) {
  if (!ym || ym === "all") return "All Months";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return Number.isNaN(d.getTime())
    ? ym
    : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const AttendanceHistoryScreen = ({ onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState("logs"); // "logs" | "passes"
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "Completed" | "Checked In"
  const [expandedLogId, setExpandedLogId] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [passes, setPasses] = useState({});
  const [expandedPassId, setExpandedPassId] = useState(null);
  const [loadingPassId, setLoadingPassId] = useState(null);
  const [passError, setPassError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [attRows, bookingRes] = await Promise.all([
        citizenService.listAttendance(),
        api.get("/api/citizen/bookings").catch(() => ({ data: [] })),
      ]);
      setAttendance(attRows || []);
      const confirmedPaid = (bookingRes?.data || []).filter(
        (b) => b.bookingStatus === "Confirmed" && b.paymentStatus === "Paid"
      );
      setBookings(confirmedPaid);
    } catch (requestError) {
      setError(requestError.message || "Could not load check-in history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleQrPass = async (booking) => {
    if (expandedPassId === booking.id) {
      setExpandedPassId(null);
      return;
    }
    setExpandedPassId(booking.id);
    if (!booking.qrAvailable || passes[booking.id]) return;
    setLoadingPassId(booking.id);
    setPassError("");
    try {
      const res = await api.get(`/api/citizen/bookings/${booking.id}/pass`);
      setPasses((prev) => ({ ...prev, [booking.id]: res.data }));
    } catch (err) {
      setPassError(err.message || "Could not load QR pass.");
    } finally {
      setLoadingPassId(null);
    }
  };

  const today = todayIso();

  const availableMonths = useMemo(() => {
    const set = new Set(
      attendance
        .map((row) => (row.date ? String(row.date).slice(0, 7) : ""))
        .filter((ym) => /^\d{4}-\d{2}$/.test(ym))
    );
    return ["all", ...[...set].sort((a, b) => b.localeCompare(a))];
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((row) => {
      if (selectedMonth !== "all" && String(row.date || "").slice(0, 7) !== selectedMonth) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [attendance, selectedMonth, statusFilter]);

  const readyBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => b.attendanceStatus !== "Completed" && (b.endDate || b.date) >= today)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [bookings, today]);

  const sportSummary = useMemo(() => {
    const map = new Map();
    attendance.forEach((row) => {
      const sport = row.sport || "Sport";
      const cur = map.get(sport) || { sport, visits: 0, completed: 0, minutes: 0 };
      cur.visits += 1;
      if (row.status === "Completed") cur.completed += 1;
      cur.minutes += Number(row.durationMinutes || 0);
      map.set(sport, cur);
    });
    return [...map.values()].sort((a, b) => b.visits - a.visits);
  }, [attendance]);

  const completed = attendance.filter((row) => row.status === "Completed").length;

  return (
    <View style={styles.safeArea}>
      <AppScreenScroll
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={GREEN}
            colors={[GREEN]}
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
          />
        }
        header={
          <AppHeader
            title="Check-ins & Gate Passes"
            subtitle="Gate scan logs & active QR entry passes"
            onBack={onBack}
            onLogout={onLogout}
          />
        }
      >
        {/* Summary Metrics Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="scan-outline" size={16} color={GREEN} />
            </View>
            <Text style={styles.summaryNum}>{attendance.length}</Text>
            <Text style={styles.summaryLabel}>Total Check-ins</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryCol}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="checkmark-done-outline" size={16} color={GREEN} />
            </View>
            <Text style={styles.summaryNum}>{completed}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryCol}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#e0f2fe" }]}>
              <Ionicons name="qr-code-outline" size={16} color="#0284c7" />
            </View>
            <Text style={styles.summaryNum}>{readyBookings.length}</Text>
            <Text style={styles.summaryLabel}>Active Passes</Text>
          </View>
        </View>

        {/* Functional Segmented Tabs */}
        <View style={styles.segmentedRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "logs" ? styles.segmentBtnActive : styles.segmentBtnInactive]}
            onPress={() => setActiveTab("logs")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === "logs" ? "#ffffff" : "#475569"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, activeTab === "logs" ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Check-in Logs ({attendance.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "passes" ? styles.segmentBtnActive : styles.segmentBtnInactive]}
            onPress={() => setActiveTab("passes")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="qr-code-outline"
              size={15}
              color={activeTab === "passes" ? "#ffffff" : "#475569"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, activeTab === "passes" ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Gate Passes ({readyBookings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "logs" ? (
          <View style={styles.logsSection}>
            {/* Month Filter Chips */}
            {availableMonths.length > 1 && (
              <View style={styles.chipRow}>
                {availableMonths.map((ym) => {
                  const active = selectedMonth === ym;
                  return (
                    <TouchableOpacity
                      key={ym}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setSelectedMonth(ym)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {monthLabel(ym)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Status Filter Chips */}
            <View style={styles.chipRow}>
              {[
                { key: "all", label: "All Visits" },
                { key: "Completed", label: "Completed" },
                { key: "Checked In", label: "Checked In" },
              ].map((opt) => {
                const active = statusFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStatusFilter(opt.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loading ? (
              <ActivityIndicator color={GREEN} style={{ paddingVertical: 24 }} />
            ) : error ? (
              <View style={styles.noticeCard}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => loadData(true)} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredAttendance.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="scan-outline" size={30} color="#64748b" />
                <Text style={styles.emptyTitle}>No check-in logs yet</Text>
                <Text style={styles.emptySub}>
                  {readyBookings.length
                    ? "Switch to Gate Passes to show your QR pass at the complex gate."
                    : "Confirmed facility bookings will log here once scanned at the gate."}
                </Text>
                {readyBookings.length > 0 && (
                  <TouchableOpacity style={styles.ctaBtn} onPress={() => setActiveTab("passes")}>
                    <Text style={styles.ctaBtnText}>View Active Gate Passes ({readyBookings.length})</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredAttendance.map((item) => {
                const dateObj = item.date ? new Date(`${item.date}T00:00:00`) : null;
                const dateDay = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.getDate() : "—";
                const dateMonth =
                  dateObj && !Number.isNaN(dateObj.getTime())
                    ? dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase()
                    : "";
                const entryLabel = formatTime(item.entry);
                const exitLabel = formatTime(item.exit);
                const isDone = item.status === "Completed";
                const expanded = expandedLogId === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.logCard}
                    activeOpacity={0.8}
                    onPress={() => setExpandedLogId(expanded ? null : item.id)}
                  >
                    <View style={styles.logRowMain}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateDay}>{dateDay}</Text>
                        <Text style={styles.dateMonth}>{dateMonth}</Text>
                      </View>

                      <View style={styles.logDetailsCol}>
                        <Text style={styles.complexName}>
                          {item.facilityName || "Sports Complex"}
                        </Text>
                        <Text style={styles.infoMetaText}>
                          {item.sport || "Sport session"} · {item.members || 1} member{(item.members || 1) === 1 ? "" : "s"}
                        </Text>
                        <Text style={styles.infoMetaText}>
                          In: {entryLabel}{isDone ? ` · Out: ${exitLabel}` : " · Exit pending"}
                        </Text>
                      </View>

                      <View style={styles.rightActionCol}>
                        <View style={[styles.statusBadge, !isDone && styles.activeBadge]}>
                          <Ionicons
                            name={isDone ? "checkmark-circle" : "radio-button-on"}
                            size={12}
                            color={isDone ? "#15803d" : "#b45309"}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.statusBadgeText, !isDone && { color: "#b45309" }]}>
                            {isDone ? "COMPLETED" : "CHECKED IN"}
                          </Text>
                        </View>
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#64748b"
                          style={{ marginTop: 10 }}
                        />
                      </View>
                    </View>

                    {expanded && (
                      <View style={styles.expandedDetails}>
                        {!!item.reference && (
                          <Text style={styles.expandedLine}>
                            <Text style={styles.expandedLabel}>Booking Ref: </Text>
                            {item.reference}
                          </Text>
                        )}
                        <Text style={styles.expandedLine}>
                          <Text style={styles.expandedLabel}>Duration: </Text>
                          {item.durationMinutes != null ? `${item.durationMinutes} min` : "Visit still active"}
                        </Text>
                        <Text style={styles.expandedLine}>
                          <Text style={styles.expandedLabel}>Date: </Text>
                          {item.date}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.logsSection}>
            {loading ? (
              <ActivityIndicator color={GREEN} style={{ paddingVertical: 24 }} />
            ) : readyBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="qr-code-outline" size={30} color="#64748b" />
                <Text style={styles.emptyTitle}>No active gate passes</Text>
                <Text style={styles.emptySub}>
                  Book a slot or subscription plan to receive a digital QR pass for gate check-in.
                </Text>
              </View>
            ) : (
              readyBookings.map((booking) => {
                const isToday = booking.bookingType === "subscription"
                  ? booking.date <= today && (booking.endDate || booking.date) >= today
                  : booking.date === today;
                const expanded = expandedPassId === booking.id;
                return (
                  <View key={booking.id} style={styles.passCard}>
                    <TouchableOpacity
                      style={styles.passHeader}
                      activeOpacity={0.78}
                      onPress={() => toggleQrPass(booking)}
                    >
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <Text style={styles.complexName}>{booking.facility}</Text>
                        <Text style={styles.infoMetaText}>
                          {booking.sport}
                          {booking.bookingType === "subscription"
                            ? ` · Plan (${booking.date} to ${booking.endDate || booking.date})`
                            : ` · ${booking.date} · ${booking.time?.from || ""}–${booking.time?.to || ""}`}
                        </Text>
                        <Text style={styles.refText}>
                          {booking.reference || String(booking.id).slice(-8).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.passBadge, isToday && styles.todayBadge]}>
                          <Text style={[styles.passBadgeText, isToday && styles.todayBadgeText]}>
                            {isToday ? "Today · Ready" : "Upcoming"}
                          </Text>
                        </View>
                        <Text style={styles.toggleQrText}>
                          {expanded ? "Hide QR ▲" : "Show QR ▼"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {expanded && (
                      <View style={styles.expandedQrWrap}>
                        {loadingPassId === booking.id ? (
                          <ActivityIndicator color={GREEN} style={{ padding: 16 }} />
                        ) : !booking.qrAvailable ? (
                          <Text style={styles.emptySub}>
                            QR pass is not available for this booking yet.
                          </Text>
                        ) : passes[booking.id] ? (
                          <BookingPassCard pass={passes[booking.id]} />
                        ) : passError ? (
                          <Text style={styles.errorText}>{passError}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Sport Attendance Summary */}
            {sportSummary.length > 0 && (
              <View style={styles.summaryBreakdownCard}>
                <Text style={styles.breakdownHeading}>Attendance Breakdown by Sport</Text>
                {sportSummary.map((row) => (
                  <View key={row.sport} style={styles.breakdownRow}>
                    <Text style={styles.breakdownSport}>{row.sport}</Text>
                    <Text style={styles.breakdownStats}>
                      {row.visits} visit{row.visits === 1 ? "" : "s"} · {row.completed} completed · {row.minutes} min
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </AppScreenScroll>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  summaryCol: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  summaryNum: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0f172a",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#e2e8f0",
  },
  segmentedRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  segmentBtnActive: {
    backgroundColor: GREEN,
  },
  segmentBtnInactive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  segmentTextInactive: {
    color: "#334155",
  },
  logsSection: {
    marginHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "#ecfdf5",
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: GREEN,
  },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  logRowMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#e8f5ee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: GREEN,
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "800",
    color: GREEN,
  },
  logDetailsCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    gap: 2,
  },
  complexName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  infoMetaText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 16,
  },
  rightActionCol: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: "#fef3c7",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    gap: 4,
  },
  expandedLine: {
    fontSize: 12,
    color: "#334155",
  },
  expandedLabel: {
    fontWeight: "700",
    color: "#0f172a",
  },
  passCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbe7df",
    overflow: "hidden",
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  refText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },
  passBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  todayBadge: {
    backgroundColor: "#dcfce7",
  },
  passBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
  },
  todayBadgeText: {
    color: GREEN,
  },
  toggleQrText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: GREEN,
  },
  expandedQrWrap: {
    borderTopWidth: 1,
    borderTopColor: "#eef2ef",
    padding: 12,
  },
  summaryBreakdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  breakdownHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  breakdownSport: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  breakdownStats: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  ctaBtn: {
    marginTop: 6,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: GREEN,
  },
  noticeCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b91c1c",
  },
});

export default AttendanceHistoryScreen;
