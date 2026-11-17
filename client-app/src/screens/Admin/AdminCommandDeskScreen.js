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
import { StatusBadge } from "../../components/common/StatusBadge";
import { GUJARAT_DISTRICTS } from "../../data/gujaratSportsData";

const STATE_DISTRICT_METRICS = [
  { district: "Ahmedabad", complexes: 4, fci: 91, grantsAllocated: "₹45.0 L", utilization: "88%" },
  { district: "Surat", complexes: 3, fci: 88, grantsAllocated: "₹38.5 L", utilization: "84%" },
  { district: "Vadodara", complexes: 3, fci: 89, grantsAllocated: "₹32.0 L", utilization: "82%" },
  { district: "Rajkot", complexes: 3, fci: 86, grantsAllocated: "₹28.0 L", utilization: "79%" },
  { district: "Gandhinagar", complexes: 2, fci: 93, grantsAllocated: "₹25.0 L", utilization: "90%" },
  { district: "Bhavnagar", complexes: 2, fci: 84, grantsAllocated: "₹18.0 L", utilization: "75%" },
];

export const AdminCommandDeskScreen = ({ user, onLogout, onNavigateTab }) => {
  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="State SAG Command Desk"
        subtitle="Government of Gujarat • State Headquarters"
        role={5}
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* State High-Level KPIs */}
        <View style={styles.statsRow}>
          <StatCard
            label="33 GUJARAT DISTRICTS"
            value="148"
            subvalue="Total Sports Facilities"
            trend="+12 New"
            trendType="up"
            icon={<Ionicons name="map" size={18} color={colors.gov.primary} />}
          />
          <StatCard
            label="STATE FCI BENCHMARK"
            value="87.6"
            subvalue="Target: 85.0"
            trend="Grade A"
            trendType="up"
            icon={<Ionicons name="shield-checkmark" size={18} color={colors.gov.accent} />}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="TOTAL GRANTS SANCTIONED"
            value="₹4.82 Cr"
            subvalue="FY 2026-27 Modernization"
            trend="82% Utilized"
            trendType="up"
            icon={<Ionicons name="cash-outline" size={18} color="#059669" />}
          />
          <StatCard
            label="ATHLETE PASSES"
            value="42,850"
            subvalue="Active digital check-ins"
            trend="+24%"
            trendType="up"
            icon={<Ionicons name="people" size={18} color="#0284c7" />}
          />
        </View>

        {/* Grant Allocation Quick Trigger Banner */}
        <View style={styles.grantCtaCard}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.grantCtaTitle}>State Grant Allocation Engine</Text>
            <Text style={styles.grantCtaSub}>
              Allocate infrastructure capital funds, synthetic turf resurfacing, and floodlight upgrades across districts.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.allocateBtn}
            onPress={() => onNavigateTab && onNavigateTab("allocate")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.allocateBtnText}>Allocate Grant</Text>
          </TouchableOpacity>
        </View>

        {/* District Infrastructure Leaderboard */}
        <Text style={styles.sectionHeading}>STATE-WIDE DISTRICT BENCHMARK & FCI RATINGS</Text>

        {STATE_DISTRICT_METRICS.map((row) => (
          <View key={row.district} style={styles.districtRowCard}>
            <View style={styles.districtLeft}>
              <Text style={styles.districtName} numberOfLines={1} ellipsizeMode="tail">{row.district}</Text>
              <Text style={styles.districtMeta} numberOfLines={1} ellipsizeMode="tail">
                {row.complexes} Complexes • {row.utilization}
              </Text>
            </View>

            <View style={styles.districtCenter}>
              <Text style={styles.grantText}>{row.grantsAllocated}</Text>
              <Text style={styles.grantLabel}>Grants</Text>
            </View>

            <View style={styles.districtRight}>
              <View style={[styles.fciTag, { backgroundColor: row.fci >= 90 ? "#dcfce7" : "#e0f2fe" }]}>
                <Text style={[styles.fciTagText, { color: row.fci >= 90 ? "#15803d" : "#0369a1" }]}>
                  FCI {row.fci}
                </Text>
              </View>
            </View>
          </View>
        ))}
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
  grantCtaCard: {
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  grantCtaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  grantCtaSub: {
    fontSize: 11,
    color: colors.brand.light,
    marginTop: 2,
    lineHeight: 16,
  },
  allocateBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  allocateBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  districtRowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  districtLeft: {
    flex: 2,
  },
  districtName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900],
  },
  districtMeta: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  districtCenter: {
    flex: 1,
    alignItems: "center",
  },
  grantText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.primary,
  },
  grantLabel: {
    fontSize: 10,
    color: colors.slate[400],
  },
  districtRight: {
    alignItems: "flex-end",
  },
  fciTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fciTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
});

export default AdminCommandDeskScreen;
