import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import { Text } from "../../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, RefreshControl } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { citizenService } from "../../services/citizen/citizenService";
const MOCK_ATTENDANCE = [{
  id: "att_1",
  dateDay: "30",
  dateMonth: "OCT",
  complex: "SAG Khokhra Sports Complex",
  court: "Badminton Court 1",
  time: "06:14 AM",
  supervisor: "Mahesh Desai",
  status: "RESOLVED"
}, {
  id: "att_2",
  dateDay: "29",
  dateMonth: "OCT",
  complex: "SAG Khokhra Sports Complex",
  court: "Badminton Court 2",
  time: "06:20 AM",
  supervisor: "Mahesh Desai",
  status: "RESOLVED"
}, {
  id: "att_3",
  dateDay: "28",
  dateMonth: "OCT",
  complex: "SAG Khokhra Sports Complex",
  court: "Badminton Court 1",
  time: "06:10 AM",
  supervisor: "Mahesh Desai",
  status: "RESOLVED"
}, {
  id: "att_4",
  dateDay: "26",
  dateMonth: "OCT",
  complex: "SAG Naranpura Sports Complex",
  court: "Track & Field",
  time: "05:55 PM",
  supervisor: "Ramesh Baria",
  status: "RESOLVED"
}, {
  id: "att_5",
  dateDay: "25",
  dateMonth: "OCT",
  complex: "SAG Khokhra Sports Complex",
  court: "Badminton Court 1",
  time: "06:18 AM",
  supervisor: "Mahesh Desai",
  status: "RESOLVED"
}, {
  id: "att_6",
  dateDay: "23",
  dateMonth: "OCT",
  complex: "SAG Khokhra Sports Complex",
  court: "Fitness Gym",
  time: "06:30 AM",
  supervisor: "Mahesh Desai",
  status: "RESOLVED"
}];
export const AttendanceHistoryScreen = ({
  onBack,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState("logs"); // "logs" | "overview"
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const loadAttendance = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);else setLoading(true);
    setError("");
    try {
      const rows = await citizenService.listAttendance();
      setAttendance(rows);
    } catch (requestError) {
      setError(requestError.message || "Could not load check-in history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    loadAttendance();
  }, []);
  const completed = attendance.filter(row => row.status === "Completed").length;
  const checkedIn = attendance.filter(row => row.status === "Checked In").length;
  return <View style={styles.safeArea}>
      <AppScreenScroll contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAttendance(true)} />} header={<AppHeader title="Attendance Ledger" subtitle="Digital Gate Check-ins & Verifications" onBack={onBack} />}>
        {/* 1. TOP CURVED HEADER — unified CitizenHeader */}


        {/* 2. SUMMARY METRICS CARD (Overlapping Header) */}
        <View style={styles.summaryCard}>
          {/* Col 1 */}
          <View style={styles.summaryCol}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="calendar" size={16} color="#007D40" />
            </View>
            <Text style={styles.summaryNum}>{attendance.length}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>Sessions in Oct</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Col 2 */}
          <View style={styles.summaryCol}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="bar-chart" size={16} color="#007D40" />
            </View>
            <Text style={styles.summaryNum}>
              {attendance.length ? `${Math.round(completed / attendance.length * 100)}%` : "—"}
            </Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>Monthly Rate</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Col 3 */}
          <View style={styles.summaryCol}>
            <View style={[styles.summaryIconBox, {
            backgroundColor: "#ffedd5"
          }]}>
              <Ionicons name="flame" size={16} color="#ea580c" />
            </View>
            <Text style={styles.summaryNum}>{checkedIn}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>Current Streak</Text>
          </View>
        </View>

        {/* 3. SEGMENTED CONTROL TABS (Check-in Logs vs Monthly Overview) */}
        <View style={styles.segmentedRow}>
          <TouchableOpacity style={[styles.segmentBtn, activeTab === "logs" ? styles.segmentBtnActive : styles.segmentBtnInactive]} onPress={() => setActiveTab("logs")} activeOpacity={0.8}>
            <Ionicons name="calendar" size={15} color={activeTab === "logs" ? "#ffffff" : "#475569"} style={{
            marginRight: 6
          }} />
            <Text style={[styles.segmentBtnText, activeTab === "logs" ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Check-in Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.segmentBtn, activeTab === "overview" ? styles.segmentBtnActive : styles.segmentBtnInactive]} onPress={() => setActiveTab("overview")} activeOpacity={0.8}>
            <Ionicons name="bar-chart-outline" size={15} color={activeTab === "overview" ? "#ffffff" : "#475569"} style={{
            marginRight: 6
          }} />
            <Text style={[styles.segmentBtnText, activeTab === "overview" ? styles.segmentTextActive : styles.segmentTextInactive]}>
              Monthly Overview
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. MONTH FILTER DROPDOWN PILL */}
        <View style={styles.monthDropdownPill}>
          <View style={styles.monthDropdownLeft}>
            <Ionicons name="calendar-outline" size={16} color="#007D40" style={{
            marginRight: 8
          }} />
            <Text style={styles.monthDropdownText}>This Month (October 2026)</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#475569" />
        </View>

        {/* 5. CHECK-IN LOGS LIST */}
        <View style={styles.logsListContainer}>
          {loading ? <Text style={styles.stateText}>Loading check-in history…</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!loading && !error && attendance.length === 0 ? <Text style={styles.stateText}>No check-ins found for this period.</Text> : null}
          {attendance.map(item => {
          const date = item.date ? new Date(`${item.date}T00:00:00`) : null;
          const dateDay = date && !Number.isNaN(date.getTime()) ? date.getDate() : "—";
          const dateMonth = date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-US", {
            month: "short"
          }).toUpperCase() : "";
          const time = item.entry ? new Date(item.entry).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }) : "Time unavailable";
          const status = item.status === "Completed" ? "COMPLETED" : "CHECKED IN";
          return <TouchableOpacity key={item.id} style={styles.logCard} activeOpacity={0.8}>
              {/* Left Date Badge */}
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{dateDay}</Text>
                <Text style={styles.dateMonth}>{dateMonth}</Text>
              </View>

              {/* Middle Information */}
              <View style={styles.logDetailsCol}>
                <Text style={styles.complexName} numberOfLines={1} ellipsizeMode="tail">
                  {item.facilityName || "Sports Complex"}
                </Text>

                <View style={styles.infoMetaRow}>
                  <Ionicons name="location-outline" size={13} color="#64748b" style={{
                  marginRight: 4
                }} />
                  <Text style={styles.infoMetaText} numberOfLines={1}>{item.durationMinutes ? `${item.durationMinutes} minutes` : "Attendance session"}</Text>
                </View>

                <View style={styles.infoMetaRow}>
                  <Ionicons name="time-outline" size={13} color="#64748b" style={{
                  marginRight: 4
                }} />
                  <Text style={styles.infoMetaText} numberOfLines={1}>{time}</Text>
                </View>

                <View style={styles.infoMetaRow}>
                  <Ionicons name="person-outline" size={13} color="#64748b" style={{
                  marginRight: 4
                }} />
                  <Text style={styles.supervisorText} numberOfLines={1}>
                    {item.status === "Completed" ? "Session completed" : "Exit pending"}
                  </Text>
                </View>
              </View>

              {/* Right Side: Status Badge & Chevron */}
              <View style={styles.rightActionCol}>
                <View style={styles.resolvedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#15803d" style={{
                  marginRight: 4
                }} />
                  <Text style={styles.resolvedBadgeText}>{status}</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{
                marginTop: 12
              }} />
              </View>
            </TouchableOpacity>;
        })}
        </View>
      </AppScreenScroll>
    </View>;
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  scrollContent: {
    paddingBottom: 40
  },
  // 2. Summary Card
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3
        },
        shadowOpacity: 0.08,
        shadowRadius: 10
      },
      android: {
        elevation: 3
      }
    })
  },
  summaryCol: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#e2e8f0"
  },
  // 3. Segmented Control
  segmentedRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 22
  },
  segmentBtnActive: {
    backgroundColor: "#007D40"
  },
  segmentBtnInactive: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700"
  },
  segmentTextActive: {
    color: "#ffffff"
  },
  segmentTextInactive: {
    color: "#334155"
  },
  // 4. Month Dropdown Pill
  monthDropdownPill: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  monthDropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  monthDropdownText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b"
  },
  // 5. Logs List Container
  logsListContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    gap: 12
  },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.04,
        shadowRadius: 6
      },
      android: {
        elevation: 2
      }
    })
  },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#e8f5ee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#007D40",
    lineHeight: 22
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "800",
    color: "#007D40",
    letterSpacing: 0.4
  },
  logDetailsCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8
  },
  complexName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4
  },
  infoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  infoMetaText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569",
    flex: 1
  },
  supervisorText: {
    fontSize: 10,
    color: "#64748b",
    flex: 1
  },
  rightActionCol: {
    alignItems: "flex-end",
    flexShrink: 0
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  resolvedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 0.3
  },
  stateText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 24
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 18
  }
});
export default AttendanceHistoryScreen;
