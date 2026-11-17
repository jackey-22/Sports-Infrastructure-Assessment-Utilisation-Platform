import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";
import { StatCard } from "../../components/common/StatCard";
import { FciGauge } from "../../components/common/FciGauge";
import { StatusBadge } from "../../components/common/StatusBadge";

export const ManagerDashboardScreen = ({ user, onLogout, onNavigateTab }) => {
  const [fciScore, setFciScore] = useState(91);

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="Manager Control Desk"
        subtitle="SAG Khokhra Sports Complex • Ahmedabad"
        role={3}
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* KPI Metrics */}
        <View style={styles.statsRow}>
          <StatCard
            label="DAILY FOOTFALL"
            value="342"
            subvalue="Athletes & Pay-Play"
            trend="+18%"
            trendType="up"
            icon={<Ionicons name="people" size={18} color={colors.gov.primary} />}
          />
          <StatCard
            label="SLOT UTILISATION"
            value="84%"
            subvalue="Peak evening capacity"
            trend="High"
            trendType="up"
            icon={<Ionicons name="stats-chart" size={18} color={colors.gov.accent} />}
          />
        </View>

        {/* Facility Condition Index (FCI) Card */}
        <FciGauge score={fciScore} showDetails={true} />

        {/* Quick Manager Action Cards */}
        <Text style={styles.sectionHeading}>INFRASTRUCTURE & GRANT MANAGEMENT</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab("audit")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="camera" size={22} color="#15803d" />
            </View>
            <Text style={styles.actionTitle}>Run FCI Audit</Text>
            <Text style={styles.actionDesc}>Capture turf & lux photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab("grants")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e0f2fe" }]}>
              <Ionicons name="cash" size={22} color="#0369a1" />
            </View>
            <Text style={styles.actionTitle}>SAG Grants</Text>
            <Text style={styles.actionDesc}>Upload milestone proof</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab("complaints")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="warning" size={22} color="#b91c1c" />
            </View>
            <Text style={styles.actionTitle}>Grievance Queue</Text>
            <Text style={styles.actionDesc}>3 open field tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab("staff")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="id-card" size={22} color="#b45309" />
            </View>
            <Text style={styles.actionTitle}>Staff & Coaches</Text>
            <Text style={styles.actionDesc}>Supervisors & Instructors</Text>
          </TouchableOpacity>
        </View>

        {/* Active SAG Grant Status */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Active Modernization Grant</Text>
            <StatusBadge status="partially released" size="sm" />
          </View>
          <Text style={styles.grantTitle} numberOfLines={1} ellipsizeMode="tail">
            Badminton Synthetic Mat & LED Lux Upgrade
          </Text>
          <Text style={styles.grantSub} numberOfLines={1} ellipsizeMode="tail">
            Sanction ID: SAG-MOD-2026-081 • Total Budget: ₹12,50,000
          </Text>

          <View style={styles.grantProgressRow}>
            <Text style={styles.grantProgressLabel}>Disbursed: ₹7,50,000 (60%)</Text>
            <Text style={styles.grantPendingLabel}>Pending Proof: ₹5,00,000</Text>
          </View>

          <TouchableOpacity
            style={styles.proofBtn}
            onPress={() => onNavigateTab && onNavigateTab("grants")}
          >
            <Text style={styles.proofBtnText}>Submit Milestone Proof & Invoices</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.gov.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[900],
  },
  actionDesc: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900],
  },
  grantTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[800],
    marginTop: 2,
  },
  grantSub: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
    marginBottom: 10,
  },
  grantProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  grantProgressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gov.primary,
  },
  grantPendingLabel: {
    fontSize: 11,
    color: colors.slate[500],
  },
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.soft,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  proofBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.primary,
  },
});

export default ManagerDashboardScreen;
