import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import { Text } from "../../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Share, Platform, Dimensions, RefreshControl, ActivityIndicator, AppState } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import BookingPassCard from "../../components/qr/BookingPassCard";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import { ResourceState } from "../../components/performance/PerformanceUI";
import { citizenService } from "../../services/citizen/citizenService";
const {
  width
} = Dimensions.get("window");
export const CitizenDashboardScreen = ({
  user,
  onLogout,
  onNavigateTab
}) => {
  const performance = usePerformanceResource(performanceService.ownEvaluations);
  const [bookings, setBookings] = useState([]);
  const [bookingPasses, setBookingPasses] = useState({});
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [loadingPassId, setLoadingPassId] = useState(null);
  const [passLoading, setPassLoading] = useState(true);
  const [passError, setPassError] = useState("");
  const [passRevision, setPassRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => {
      setPassLoading(true);
      setPassError("");
      api.get("/api/citizen/bookings").then(result => {
        if (active) {
          const confirmedOnly = (result.data || []).filter(
            (b) => b.bookingStatus === "Confirmed" && b.paymentStatus === "Paid"
          );
          setBookings(confirmedOnly);
        }
      }).catch(error => {
        if (active) {
          setPassError(error.message);
          setBookings([]);
        }
      }).finally(() => {
        if (active) setPassLoading(false);
      });
    };
    load();
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") load();
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, [user?._id, passRevision]);
  const toggleBooking = async booking => {
    if (expandedBookingId === booking.id) {
      setExpandedBookingId(null);
      return;
    }
    setExpandedBookingId(booking.id);
    if (!booking.qrAvailable || bookingPasses[booking.id]) return;
    setLoadingPassId(booking.id);
    setPassError("");
    try {
      const result = await api.get(`/api/citizen/bookings/${booking.id}/pass`);
      setBookingPasses(current => ({
        ...current,
        [booking.id]: result.data
      }));
    } catch (error) {
      setPassError(error.message);
    } finally {
      setLoadingPassId(null);
    }
  };
  const [identity, setIdentity] = useState(null);
  const [identityError, setIdentityError] = useState("");
  useEffect(() => {
    let active = true;
    citizenService.getIdentity().then(result => {
      if (active) setIdentity(result);
    }).catch(error => {
      if (active) setIdentityError(error.message || "Could not load athlete profile.");
    });
    return () => {
      active = false;
    };
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const completedVisits = bookings.filter((booking) => booking.attendanceStatus === "Completed").length;
  const activeUpcomingCount = bookings.filter(
    (booking) => (booking.endDate || booking.date) >= today && booking.attendanceStatus !== "Completed"
  ).length;
  const evaluations = performance.data || [];
  const primarySport = evaluations[0]?.sport?.SportName || bookings[0]?.sport || "Not available";
  const athleteData = {
    name: identity?.user?.Name || user?.Name || "Athlete",
    dob: identity?.user?.DOB || "Not provided",
    gender: "Not provided",
    mobile: identity?.user?.ContactNum || user?.ContactNum || "Not provided",
    primarySport,
    regDate: identity?.athlete?.createdAt ? new Date(identity.athlete.createdAt).toLocaleDateString() : "Not provided",
    athleteId: identity?.athleteId || "Not linked",
  };
  const handleShareId = async () => {
    try {
      await Share.share({
        message: `Gujarat Athlete ID: ${athleteData.athleteId} - ${athleteData.name} (${athleteData.primarySport}). Verified by Sports Authority of Gujarat (SAG).`
      });
    } catch (error) {
      // ignore
    }
  };
  return <View style={styles.safeArea}>
      <AppScreenScroll contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={passLoading} onRefresh={() => setPassRevision(value => value + 1)} tintColor="#007D40" />} header={<AppHeader title="Athlete Hub" subtitle="Your sports journey in Gujarat" onLogout={onLogout} />}>
        {/* 1. TOP CURVED HEADER — unified CitizenHeader */}

        {identityError ? <Text style={styles.identityError}>{identityError}</Text> : null}

        {/* 2. WELCOME CARD */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreet}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{athleteData.name}</Text>
            <Text style={styles.welcomeDesc}>
              Track your bookings, gate passes and grow your sports profile.
            </Text>
          </View>

          <View style={styles.welcomeRight}>
            <View style={styles.runnerGraphicBox}>
              <MaterialCommunityIcons name="run" size={36} color="#86efac" />
            </View>
          </View>
        </View>

        {/* 3. BOOKING COUNT CARDS */}
        <View style={styles.metricCardsRow}>
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => onNavigateTab && onNavigateTab("attendance")}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconBox}>
                <Ionicons name="calendar-outline" size={16} color="#007D40" />
              </View>
              <Text style={styles.metricCardTitle}>My Bookings</Text>
            </View>
            <Text style={styles.metricValue}>{bookings.length}</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillText}>
                {bookings.length ? `${completedVisits} completed visit${completedVisits === 1 ? "" : "s"}` : "No confirmed bookings yet"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.8}
            onPress={() => onNavigateTab && onNavigateTab("attendance")}
          >
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconBox, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="qr-code-outline" size={16} color="#0284c7" />
              </View>
              <Text style={styles.metricCardTitle}>Active Passes</Text>
            </View>
            <Text style={styles.metricValue}>{activeUpcomingCount}</Text>
            <View style={[styles.trendPill, { backgroundColor: "#e0f2fe" }]}>
              <Text style={[styles.trendPillText, { color: "#0369a1" }]}>
                {activeUpcomingCount ? "Tap to view check-ins & QR" : "Book a slot for gate QR"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>MY FACILITY BOOKINGS</Text>
          {passLoading ? <ActivityIndicator color="#007D40" style={{
          padding: 25
        }} /> : passError && !bookings.length ? <View style={styles.digitalIdCard}><Text style={styles.identityError}>{passError}</Text><TouchableOpacity onPress={() => setPassRevision(value => value + 1)} style={{
            padding: 18
          }}><Text style={{
              color: "#007D40",
              fontWeight: "700"
            }}>Retry bookings</Text></TouchableOpacity></View> : bookings.length ? <View style={{
          gap: 12
        }}>{bookings.map(booking => {
            const expanded = expandedBookingId === booking.id;
            return <View key={booking.id} style={styles.bookingCard}>
              <TouchableOpacity onPress={() => toggleBooking(booking)} activeOpacity={0.75} style={styles.bookingSummary}>
                <View style={{
                  flex: 1,
                  gap: 4
                }}><Text style={styles.bookingFacility}>{booking.facility}</Text><Text style={styles.bookingMeta}>{booking.sport}{booking.bookingType === "subscription" ? ` · Plan (${booking.date} to ${booking.endDate || booking.date})` : ` · ${booking.date} · ${booking.time?.from || ""}-${booking.time?.to || ""}`}</Text><Text style={styles.bookingReference}>{booking.reference || String(booking.id).slice(-8).toUpperCase()}</Text></View>
                <View style={{
                  alignItems: "flex-end",
                  gap: 6
                }}><Text style={[styles.bookingStatus, booking.attendanceStatus === "Completed" && styles.bookingCompleted]}>{booking.attendanceStatus === "Completed" ? "Visit completed" : booking.bookingStatus}</Text><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#007D40" /></View>
              </TouchableOpacity>
              {expanded ? <View style={styles.bookingExpanded}>
                {loadingPassId === booking.id ? <ActivityIndicator color="#007D40" style={{
                  padding: 20
                }} /> : booking.attendanceStatus === "Completed" ? <Text style={styles.completedMessage}>Check-in and check-out are complete. This booking QR pass is no longer available.</Text> : !booking.qrAvailable ? <Text style={styles.completedMessage}>{booking.paymentStatus !== "Paid" ? "The QR pass becomes available after successful payment." : "A QR pass is not available for this booking."}</Text> : bookingPasses[booking.id] ? <BookingPassCard pass={bookingPasses[booking.id]} /> : passError ? <Text style={styles.identityError}>{passError}</Text> : null}
              </View> : null}
            </View>;
          })}</View> : <View style={[styles.digitalIdCard, {
          padding: 22,
          gap: 14
        }]}><Text style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#193D28"
          }}>Your bookings will appear here</Text><Text style={{
            fontSize: 12,
            lineHeight: 20,
            color: "#708377"
          }}>Book a facility and complete payment to receive a QR pass.</Text><TouchableOpacity onPress={() => onNavigateTab?.("explore")} style={{
            padding: 14,
            backgroundColor: "#E8F5EE",
            borderRadius: 12
          }}><Text style={{
              color: "#007D40",
              fontWeight: "700"
            }}>Explore & book a facility</Text></TouchableOpacity></View>}
        </View>

        {/* 5. QUICK ACTIONS SECTION (2x2 Grid) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => onNavigateTab && onNavigateTab("explore")} activeOpacity={0.7}>
              <View style={[styles.actionIconBox, {
              backgroundColor: "#e0f2fe"
            }]}>
                <Ionicons name="calendar" size={17} color="#0284c7" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Book Facility</Text>
                <Text style={styles.actionDesc}>Courts, slots & passes</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => onNavigateTab && onNavigateTab("performance")} activeOpacity={0.7}>
              <View style={[styles.actionIconBox, {
              backgroundColor: "#ffedd5"
            }]}>
                <Ionicons name="ribbon" size={17} color="#ea580c" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Skills & Awards</Text>
                <Text style={styles.actionDesc}>Scores, insights & medals</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => onNavigateTab && onNavigateTab("attendance")} activeOpacity={0.7}>
              <View style={[styles.actionIconBox, {
              backgroundColor: "#f3e8ff"
            }]}>
                <Ionicons name="qr-code" size={17} color="#9333ea" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Check-ins & QR</Text>
                <Text style={styles.actionDesc}>Gate passes & logs</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => onNavigateTab && onNavigateTab("goals")} activeOpacity={0.7}>
              <View style={[styles.actionIconBox, {
              backgroundColor: "#fef3c7"
            }]}>
                <Ionicons name="trophy" size={17} color="#d97706" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Goals & Badges</Text>
                <Text style={styles.actionDesc}>Targets, XP & rank badges</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => onNavigateTab && onNavigateTab("complaints")} activeOpacity={0.7}>
              <View style={[styles.actionIconBox, {
              backgroundColor: "#dcfce7"
            }]}>
                <Ionicons name="shield-outline" size={17} color="#15803d" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Raise Grievance</Text>
                <Text style={styles.actionDesc}>Report facility concerns</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. RECENT PERFORMANCE & ACTIVITY */}
        <View style={styles.sectionContainer}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.activityHeaderTitle}>Recent Performance & Activity</Text>
            <TouchableOpacity onPress={() => onNavigateTab && onNavigateTab("performance")}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          <ResourceState loading={performance.loading} error={performance.error} onRetry={performance.reload} empty={!performance.data?.length} emptyText="No performance evaluations yet." />
          {(performance.data || []).slice(0, 2).map(evaluation => <TouchableOpacity key={evaluation._id} style={styles.activityCard} onPress={() => onNavigateTab?.("performance")}><View style={{
            flex: 1,
            gap: 5
          }}><Text style={styles.activityTitle}>{evaluation.sport?.SportName || "Sport"}: {evaluation.totalScore} / 100</Text><Text style={styles.activitySub}>{evaluation.recognition?.label || "Evaluated"} | {new Date(evaluation.evaluationDate).toLocaleDateString()}</Text></View><Ionicons name="chevron-forward" size={18} color="#047857" /></TouchableOpacity>)}

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
  // 2. Welcome Card
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 0,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  welcomeLeft: {
    flex: 1,
    marginRight: 10
  },
  welcomeGreet: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 1
  },
  identityError: {
    marginHorizontal: 16,
    marginTop: 10,
    color: colors.status.danger,
    fontSize: 12
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
    marginBottom: 4
  },
  welcomeDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 3
  },
  welcomeRight: {
    alignItems: "center",
    flexShrink: 0
  },
  runnerGraphicBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center"
  },
  // 3. Two Metric Cards Row
  metricCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 0,
    // prevents overflow
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
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6
  },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2
  },
  metricCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    flex: 1
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 6
  },
  trendPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "stretch"
  },
  trendPillText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: "#15803d",
    flexShrink: 1
  },
  // 4. Section Container
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10
  },
  bookingCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE9E0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF"
  },
  bookingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15
  },
  bookingFacility: {
    color: "#193D28",
    fontSize: 14,
    fontWeight: "800"
  },
  bookingMeta: {
    color: "#5E7566",
    fontSize: 11
  },
  bookingReference: {
    color: "#007D40",
    fontSize: 10,
    fontWeight: "700"
  },
  bookingStatus: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#D5F5DF",
    color: "#007D40",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: "800"
  },
  bookingCompleted: {
    backgroundColor: "#EEF2F0",
    color: "#64748B"
  },
  bookingExpanded: {
    borderTopWidth: 1,
    borderTopColor: "#E7EEE9",
    padding: 12
  },
  completedMessage: {
    borderRadius: 12,
    backgroundColor: "#F1F5F3",
    color: "#5E7566",
    padding: 15,
    fontSize: 12,
    lineHeight: 18
  },
  // Digital ID Card
  digitalIdCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.07,
        shadowRadius: 10
      },
      android: {
        elevation: 3
      }
    })
  },
  // Quick Actions Grid (2x2)
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickActionCard: {
    width: (width - 42) / 2,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 68
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  actionTextBox: {
    flex: 1,
    minWidth: 0
  },
  actionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 16
  },
  actionDesc: {
    fontSize: 10.5,
    color: "#64748b",
    lineHeight: 14,
    marginTop: 2
  },
  // Recent Performance & Activity
  activityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  activityHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007D40"
  },
  activityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a"
  },
  activitySub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  }
});
export default CitizenDashboardScreen;
