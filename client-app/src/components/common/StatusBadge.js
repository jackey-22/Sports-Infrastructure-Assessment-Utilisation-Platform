import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STATUS_CONFIGS = {
  // Grants
  "allocated": { bg: "#e0f2fe", text: "#0369a1", label: "Allocated" },
  "partially released": { bg: "#fef3c7", text: "#b45309", label: "Partially Released" },
  "utilisation pending": { bg: "#fed7aa", text: "#c2410c", label: "Utilisation Pending" },
  "under verification": { bg: "#f3e8ff", text: "#7e22ce", label: "Under Verification" },
  "closed": { bg: "#dcfce7", text: "#15803d", label: "Closed" },

  // Grievances
  "pending": { bg: "#fee2e2", text: "#b91c1c", label: "Pending" },
  "in review": { bg: "#fef3c7", text: "#b45309", label: "In Review" },
  "action taken": { bg: "#e0f2fe", text: "#0369a1", label: "Action Taken" },
  "resolved": { bg: "#dcfce7", text: "#15803d", label: "Resolved" },

  // Conditions & FCI
  "grade a": { bg: "#dcfce7", text: "#15803d", label: "Grade A · Excellent" },
  "grade b": { bg: "#e0f2fe", text: "#0369a1", label: "Grade B · Good" },
  "grade c": { bg: "#fef3c7", text: "#b45309", label: "Grade C · Needs Attention" },
  "critical": { bg: "#fee2e2", text: "#b91c1c", label: "Critical Damage" },

  // Transactions
  "success": { bg: "#dcfce7", text: "#15803d", label: "Success" },
  "failed": { bg: "#fee2e2", text: "#b91c1c", label: "Failed" },
  "refunded": { bg: "#f1f5f9", text: "#475569", label: "Refunded" },
};

export const StatusBadge = ({ status, size = "md" }) => {
  if (!status) return null;
  const key = String(status).toLowerCase().trim();
  const config = STATUS_CONFIGS[key] || {
    bg: "#f1f5f9",
    text: "#475569",
    label: status,
  };

  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: config.text }, isSmall && styles.badgeTextSm]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badgeTextSm: {
    fontSize: 10,
  },
});

export default StatusBadge;
