import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import { Text } from "../../components/AppText";
import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { api } from "../../api/client";
import { GUJARAT_FACILITIES } from "../../data/gujaratSportsData";
export const DsoDashboardScreen = ({
  user,
  onLogout
}) => {
  const [district] = useState("Ahmedabad");
  const [grievances, setGrievances] = useState(null);
  const [grievanceError, setGrievanceError] = useState("");
  const loadGrievances = async () => {
    try {
      const result = await api.get("/api/grievances?view=assigned");
      setGrievances(result.data || []);
      setGrievanceError("");
    } catch (error) {
      setGrievanceError(error.message);
    }
  };
  useEffect(() => {
    loadGrievances();
  }, []);
  const resolved = grievances?.filter(item => item.status === 1).length || 0;
  const pending = grievances ? grievances.length - resolved : 0;
  const districtFacilities = GUJARAT_FACILITIES.filter(f => f.district.toLowerCase() === district.toLowerCase());
  return <View style={styles.container}>


      <AppScreenScroll contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} header={<AppHeader title="DSO Command Desk" subtitle="District Sports Officer • Ahmedabad" onLogout={onLogout} />}>
        {/* District KPI Metrics */}
        <View style={styles.statsRow}>
          <StatCard label="DISTRICT COMPLEXES" value={districtFacilities.length || 4} subvalue="Under Ahmedabad DSO" icon={<Ionicons name="business" size={18} color={colors.gov.primary} />} />
          <StatCard label="AVG DISTRICT FCI" value="89.4" subvalue="State Benchmark 84" trend="Grade A" trendType="up" icon={<Ionicons name="ribbon" size={18} color={colors.gov.accent} />} />
        </View>

        {/* District Grievance Resolution Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>District Grievance Oversight</Text>
            <StatusBadge status={pending ? "pending" : "resolved"} size="sm" />
          </View>
          <Text style={styles.summaryDesc}>
            {grievanceError || (grievances ? `${grievances.length} grievances assigned to your district authority queue.` : "Loading grievances...")}
          </Text>
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNum}>{grievances ? resolved : "..."}</Text>
              <Text style={styles.metricLabel}>Resolved</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNum, {
              color: colors.gov.accent
            }]}>{grievances ? pending : "..."}</Text>
              <Text style={styles.metricLabel}>In Progress</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNum, {
              color: "#10b981"
            }]}>{grievances ? grievances.filter(item => item.overdue && item.status !== 1).length : "..."}</Text>
              <Text style={styles.metricLabel}>Overdue</Text>
            </View>
          </View>
        </View>

        {!!grievanceError && <TouchableOpacity onPress={loadGrievances}><Text>Retry loading grievances</Text></TouchableOpacity>}

        {/* Facilities under this DSO */}
        <Text style={styles.sectionHeading}>SPORTS COMPLEXES IN AHMEDABAD DISTRICT</Text>

        {districtFacilities.map(fac => <View key={fac.id} style={styles.facCard}>
            <View style={styles.facTop}>
              <View style={{
            flex: 1,
            marginRight: 8
          }}>
                <Text style={styles.facTitle} numberOfLines={1} ellipsizeMode="tail">{fac.name}</Text>
                <Text style={styles.facLocation} numberOfLines={1} ellipsizeMode="tail">{fac.taluka} • {fac.areaAcres || "14.5"} Acres</Text>
              </View>
              <StatusBadge status={fac.condition?.score >= 85 ? "grade a" : "grade b"} size="sm" />
            </View>

            <View style={styles.managerRow}>
              <Ionicons name="person" size={14} color={colors.slate[500]} />
              <Text style={styles.managerName} numberOfLines={1} ellipsizeMode="tail">
                {fac.contactPerson || "Facility Manager"}
              </Text>
            </View>

            <View style={styles.facFooter}>
              <Text style={styles.fciText}>
                FCI Score: <Text style={styles.fciVal}>{fac.condition?.score || 91}/100</Text>
              </Text>
              <TouchableOpacity style={styles.inspectBtn}>
                <Text style={styles.inspectBtnText}>View DSO Audit Log</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.gov.primary} />
              </TouchableOpacity>
            </View>
          </View>)}
      </AppScreenScroll>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50]
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900]
  },
  summaryDesc: {
    fontSize: 12,
    color: colors.slate[600],
    lineHeight: 18,
    marginBottom: 12
  },
  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100]
  },
  metricItem: {
    alignItems: "center"
  },
  metricNum: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate[900]
  },
  metricLabel: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 2
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.slate[200]
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginVertical: 10
  },
  facCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12
  },
  facTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6
  },
  facTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900]
  },
  facLocation: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 6
  },
  managerName: {
    fontSize: 12,
    color: colors.slate[600],
    fontWeight: "500"
  },
  facFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    marginTop: 4
  },
  fciText: {
    fontSize: 12,
    color: colors.slate[600]
  },
  fciVal: {
    fontWeight: "800",
    color: colors.gov.primary
  },
  inspectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  inspectBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.primary
  }
});
export default DsoDashboardScreen;
