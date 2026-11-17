import { Text } from "../../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Share, Platform, Dimensions, RefreshControl, ActivityIndicator, AppState } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import BookingPassCard from "../../components/qr/BookingPassCard";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import CitizenHeader from "../../components/common/CitizenHeader";
import { citizenService } from "../../services/citizen/citizenService";

const { width } = Dimensions.get("window");

export const CitizenDashboardScreen = ({ user, onLogout, onNavigateTab }) => {
  const [bookingPass, setBookingPass] = useState(null);
  const [passLoading, setPassLoading] = useState(true);
  const [passError, setPassError] = useState("");
  const [passRevision, setPassRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => { setPassLoading(true); setPassError(""); api.get("/api/citizen/booking-pass/latest").then(result => { if (active) setBookingPass(result.data); }).catch(error => { if (active) { setPassError(error.message); setBookingPass(null); } }).finally(() => { if (active) setPassLoading(false); }); };
    load();
    const listener = AppState.addEventListener("change", state => { if (state === "active") load(); });
    return () => { active = false; listener.remove(); };
  }, [user?._id, passRevision]);
  const [identity, setIdentity] = useState(null);
  const [identityError, setIdentityError] = useState("");

  useEffect(() => {
    let active = true;
    citizenService.getIdentity()
      .then((result) => {
        if (active) setIdentity(result);
      })
      .catch((error) => {
        if (active) setIdentityError(error.message || "Could not load athlete profile.");
      });
    return () => {
      active = false;
    };
  }, []);

  const athleteData = {
    name: identity?.user?.Name || user?.Name || "Athlete",
    dob: identity?.user?.DOB || "Not provided",
    gender: "Not provided",
    mobile: identity?.user?.ContactNum || user?.ContactNum || "Not provided",
    primarySport: "Badminton",
    regDate: identity?.athlete?.createdAt
      ? new Date(identity.athlete.createdAt).toLocaleDateString()
      : "Not provided",
    athleteId: identity?.athleteId || "Not linked",
    activityScore: "89%",
    overallPerf: "4.6 / 5",
  };

  const handleShareId = async () => {
    try {
      await Share.share({
        message: `Gujarat Athlete ID: ${athleteData.athleteId} - ${athleteData.name} (${athleteData.primarySport}). Verified by Sports Authority of Gujarat (SAG).`,
      });
    } catch (error) {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={passLoading} onRefresh={() => setPassRevision(value => value + 1)} tintColor="#007D40" />}
      >
        {/* 1. TOP CURVED HEADER — unified CitizenHeader */}
        <CitizenHeader
          title="Athlete Hub"
          subtitle="Your sports journey in Gujarat"
          onLogout={onLogout}
          showLogout
          watermarkIcon="run-fast"
        />
        {identityError ? <Text style={styles.identityError}>{identityError}</Text> : null}

        {/* 2. WELCOME CARD */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreet}>Welcome back,</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>{athleteData.name}</Text>
            <Text style={styles.welcomeDesc}>
              Track your activity, book facilities{"\n"}and grow your sports profile.
            </Text>
          </View>

          <View style={styles.welcomeRight}>
            <View style={styles.runnerGraphicBox}>
              <MaterialCommunityIcons name="run" size={36} color="#86efac" />
            </View>
          </View>
        </View>

        {/* 3. TWO METRIC CARDS (Side by side) */}
        <View style={styles.metricCardsRow}>
          {/* Card 1: Activity Score */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconBox}>
                <Ionicons name="bar-chart" size={16} color="#007D40" />
              </View>
              <Text style={styles.metricCardTitle} numberOfLines={1}>Activity Score</Text>
              <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>{athleteData.activityScore}</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillText}>↑ +5% vs. last month</Text>
            </View>
          </View>

          {/* Card 2: Overall Performance */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconBox}>
                <Ionicons name="star-outline" size={16} color="#007D40" />
              </View>
              <Text style={styles.metricCardTitle} numberOfLines={1}>Overall Performance</Text>
              <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>{athleteData.overallPerf}</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillText} numberOfLines={1}>↑ +0.2 from recent</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>YOUR LATEST FACILITY BOOKING</Text>
          {passLoading ? <ActivityIndicator color="#007D40" style={{ padding: 25 }} /> : passError ? <View style={styles.digitalIdCard}><Text style={styles.identityError}>{passError}</Text><TouchableOpacity onPress={() => setPassRevision(value => value + 1)} style={{ padding: 18 }}><Text style={{ color: "#007D40", fontWeight: "700" }}>Retry booking pass</Text></TouchableOpacity></View> : bookingPass ? <BookingPassCard pass={bookingPass} /> : <View style={[styles.digitalIdCard, { padding: 22, gap: 14 }]}><Text style={{ fontSize: 16, fontWeight: "700", color: "#193D28" }}>Your next session starts here</Text><Text style={{ fontSize: 12, lineHeight: 20, color: "#708377" }}>Book a facility and complete payment to receive your QR pass here.</Text><TouchableOpacity onPress={() => onNavigateTab?.("explore")} style={{ padding: 14, backgroundColor: "#E8F5EE", borderRadius: 12 }}><Text style={{ color: "#007D40", fontWeight: "700" }}>Explore & book a facility</Text></TouchableOpacity></View>}
        </View>

        {/* 5. QUICK ACTIONS SECTION (2x2 Grid) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>QUICK ACTIONS</Text>

          <View style={styles.quickActionsGrid}>
            {/* Action 1: Book a Facility */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => onNavigateTab && onNavigateTab("explore")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="calendar" size={18} color="#0284c7" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Book a Facility</Text>
                <Text style={styles.actionDesc} numberOfLines={2}>Reserve grounds, courts and other assets</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Action 2: Register for Event */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => onNavigateTab && onNavigateTab("events")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#ffedd5" }]}>
                <Ionicons name="trophy" size={18} color="#ea580c" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Register for Event</Text>
                <Text style={styles.actionDesc} numberOfLines={2}>Join tournaments and sports events</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Action 3: Find a Coach */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => onNavigateTab && onNavigateTab("performance")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#f3e8ff" }]}>
                <Ionicons name="person" size={18} color="#9333ea" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Find a Coach</Text>
                <Text style={styles.actionDesc} numberOfLines={2}>Discover verified coaches across Gujarat</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Action 4: Report an Issue */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => onNavigateTab && onNavigateTab("complaints")}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="shield-outline" size={18} color="#15803d" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Report an Issue</Text>
                <Text style={styles.actionDesc} numberOfLines={2}>Raise maintenance or facility concerns</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
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

          {/* Activity Event Item */}
          <View style={styles.activityCard}>
            <View style={styles.activityCardLeft}>
              <View style={styles.sportIconSquare}>
                <MaterialCommunityIcons name="shoe-sneaker" size={20} color="#007D40" />
              </View>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  District Badminton Championship
                </Text>
                <Text style={styles.activitySub} numberOfLines={1}>
                  Participated • Ahmedabad
                </Text>
              </View>
            </View>

            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          </View>

          {/* Milestone Stepper Bar */}
          <View style={styles.stepperCard}>
            <View style={styles.stepperDotsRow}>
              {/* Step 1 */}
              <View style={styles.stepNode}>
                <View style={[styles.stepCircle, styles.stepDone]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
              </View>
              <View style={[styles.stepConnectingLine, styles.stepLineDone]} />

              {/* Step 2 */}
              <View style={styles.stepNode}>
                <View style={[styles.stepCircle, styles.stepDone]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
              </View>
              <View style={[styles.stepConnectingLine, styles.stepLineDone]} />

              {/* Step 3 */}
              <View style={styles.stepNode}>
                <View style={[styles.stepCircle, styles.stepDone]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
              </View>
              <View style={styles.stepConnectingLine} />

              {/* Step 4 */}
              <View style={styles.stepNode}>
                <View style={[styles.stepCircle, styles.stepPending]} />
              </View>
            </View>

            {/* Stepper Labels */}
            <View style={styles.stepperLabelsRow}>
              <Text style={styles.stepLabel} numberOfLines={1}>Profile Setup</Text>
              <Text style={styles.stepLabel} numberOfLines={1}>ID Verified</Text>
              <Text style={styles.stepLabel} numberOfLines={1}>1+ Booking</Text>
              <Text style={styles.stepLabel} numberOfLines={1}>Event Participation</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  // 1. Header — now handled by CitizenHeader component (no local header styles needed)

  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  hubTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  hubIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  hubTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  hubSubtitle: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  decorativeCurve: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 12,
  },

  // 2. Welcome Card
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  welcomeLeft: {
    flex: 1,
    marginRight: 10,
  },
  welcomeGreet: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 1,
  },
  identityError: {
    marginHorizontal: 16,
    marginTop: 10,
    color: colors.status.danger,
    fontSize: 12,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  welcomeDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 3,
  },
  welcomeRight: {
    alignItems: "center",
    flexShrink: 0,
  },
  runnerGraphicBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },

  // 3. Two Metric Cards Row
  metricCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 0, // prevents overflow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  metricCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  trendPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },

  // 4. Section Container
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  idCardHeaderBanner: {
    backgroundColor: "#007D40",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  idRunnerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  idHeaderTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  idHeaderSub: {
    color: "#d1fae5",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  shareBtnText: {
    color: "#007D40",
    fontSize: 11,
    fontWeight: "800",
  },
  idCardBody: {
    padding: 16,
    alignItems: "center",
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  qrBox: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  idNumberPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  idNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: 0.5,
  },

  // 2-Column ID Details Grid
  idDetailsGrid: {
    width: "100%",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 12,
  },
  detailGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailItemCol: {
    flex: 1,
    minWidth: 0,
  },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  detailLabelText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },

  // Quick Actions Grid (2x2)
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionCard: {
    width: (width - 42) / 2, // perfectly balanced 2 columns without clipping
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 64,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionTextBox: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  actionDesc: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 13,
    marginTop: 2,
  },

  // Recent Performance & Activity
  activityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  activityHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007D40",
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
    marginBottom: 12,
  },
  activityCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  sportIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  activitySub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },

  // Milestone Stepper Card
  stepperCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stepperDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  stepNode: {
    alignItems: "center",
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: {
    backgroundColor: "#007D40",
  },
  stepPending: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  stepConnectingLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: "#007D40",
  },
  stepperLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#475569",
    width: (width - 70) / 4,
    textAlign: "center",
  },
});

export default CitizenDashboardScreen;
