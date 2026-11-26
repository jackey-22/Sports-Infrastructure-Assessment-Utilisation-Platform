import { Text } from "../AppText";
import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const StatCard = ({
  label,
  value,
  subvalue,
  trend,
  trendType = "neutral",
  icon = null,
  dark = false,
}) => {
  const isUp = trendType === "up";
  const isDown = trendType === "down";

  return (
    <View style={[styles.card, dark ? styles.cardDark : styles.cardLight]}>
      <View style={styles.topRow}>
        <Text
          style={[styles.label, dark ? styles.labelDark : styles.labelLight]}
        >
          {label}
        </Text>
        {icon}
      </View>

      <Text
        style={[styles.value, dark ? styles.valueDark : styles.valueLight]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>

      <View style={styles.bottomRow}>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              isUp && styles.trendUp,
              isDown && styles.trendDown,
              !isUp && !isDown && styles.trendNeutral,
            ]}
          >
            <Text
              style={[
                styles.trendText,
                isUp && styles.trendTextUp,
                isDown && styles.trendTextDown,
                !isUp && !isDown && styles.trendTextNeutral,
              ]}
            >
              {trend}
            </Text>
          </View>
        )}
        {subvalue ? (
          <Text
            style={[styles.subvalue, dark ? styles.subvalueDark : styles.subvalueLight]}
          >
            {subvalue}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 0, // allow flex to shrink without clipping
    marginBottom: 10,
  },
  cardLight: {
    backgroundColor: "#ffffff",
    borderColor: colors.slate[200],
  },
  cardDark: {
    backgroundColor: colors.gov.card,
    borderColor: colors.slate[700],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  labelLight: {
    color: colors.slate[500],
  },
  labelDark: {
    color: colors.slate[400],
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  valueLight: {
    color: colors.slate[900],
  },
  valueDark: {
    color: "#ffffff",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  trendUp: {
    backgroundColor: "#dcfce7",
  },
  trendDown: {
    backgroundColor: "#fee2e2",
  },
  trendNeutral: {
    backgroundColor: colors.slate[100],
  },
  trendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  trendTextUp: {
    color: "#15803d",
  },
  trendTextDown: {
    color: "#b91c1c",
  },
  trendTextNeutral: {
    color: colors.slate[600],
  },
  subvalue: {
    fontSize: 10,
    flexShrink: 1,
  },
  subvalueLight: {
    color: colors.slate[500],
  },
  subvalueDark: {
    color: colors.slate[400],
  },
});

export default StatCard;
