import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const FciGauge = ({ score = 85, showDetails = true }) => {
  let category = "Excellent";
  let grade = "Grade A";
  let barColor = "#10b981";
  let textColor = "#047857";
  let bgBadge = "#dcfce7";

  if (score >= 90) {
    category = "Excellent Condition";
    grade = "Grade A";
    barColor = "#10b981";
    textColor = "#047857";
    bgBadge = "#dcfce7";
  } else if (score >= 75) {
    category = "Good Operational State";
    grade = "Grade B";
    barColor = "#0284c7";
    textColor = "#0369a1";
    bgBadge = "#e0f2fe";
  } else if (score >= 60) {
    category = "Maintenance Required";
    grade = "Grade C";
    barColor = "#f59e0b";
    textColor = "#b45309";
    bgBadge = "#fef3c7";
  } else {
    category = "Critical Damage / Urgent Repair";
    grade = "Critical";
    barColor = "#ef4444";
    textColor = "#b91c1c";
    bgBadge = "#fee2e2";
  }

  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Facility Condition Index (FCI)</Text>
          <Text style={styles.subtitle}>State Infrastructure Health Metric</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: bgBadge }]}>
          <Text style={[styles.gradeText, { color: textColor }]}>{grade}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color: textColor }]}>{clampedScore}</Text>
        <Text style={styles.scoreMax}>/ 100</Text>
        <Text style={[styles.categoryText, { color: textColor }]}>{category}</Text>
      </View>

      {/* Progress Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedScore}%`, backgroundColor: barColor }]} />
      </View>

      {showDetails && (
        <View style={styles.detailsRow}>
          <Text style={styles.detailItem}>Turf & Court: <Text style={styles.bold}>{Math.round(score * 0.95)}%</Text></Text>
          <Text style={styles.detailItem}>Floodlights: <Text style={styles.bold}>850 Lux</Text></Text>
          <Text style={styles.detailItem}>Accessibility: <Text style={styles.bold}>Verified</Text></Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 14,
    color: colors.slate[400],
    fontWeight: "600",
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  track: {
    height: 10,
    backgroundColor: colors.slate[100],
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  fill: {
    height: "100%",
    borderRadius: 5,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  detailItem: {
    fontSize: 11,
    color: colors.slate[600],
  },
  bold: {
    fontWeight: "700",
    color: colors.slate[800],
  },
});

export default FciGauge;
