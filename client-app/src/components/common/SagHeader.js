import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

const ROLE_LABELS = {
  5: { label: "State SAG Admin", roleCode: "ROLE 5", badgeBg: "#fee2e2", badgeColor: "#b91c1c" },
  4: { label: "District Officer (DSO)", roleCode: "ROLE 4", badgeBg: "#fef3c7", badgeColor: "#b45309" },
  3: { label: "Facility Manager", roleCode: "ROLE 3", badgeBg: "#dcfce7", badgeColor: "#15803d" },
  2: { label: "Coach / Instructor", roleCode: "ROLE 2", badgeBg: "#f3e8ff", badgeColor: "#7e22ce" },
  1: { label: "Field Supervisor", roleCode: "ROLE 1", badgeBg: "#e0f2fe", badgeColor: "#0369a1" },
  0: { label: "Citizen / Athlete", roleCode: "ROLE 0", badgeBg: "#e8f5ee", badgeColor: "#007D40" },
};

export const SagHeader = ({
  title = "KhelGujarat GIS",
  subtitle = "Sports Authority of Gujarat",
  role = null,
  onLogout = null,
  onBack = null,
  rightAction = null,
  showLogo = true,
}) => {
  const roleInfo = role !== null && ROLE_LABELS[role] ? ROLE_LABELS[role] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        {/* Top Branding Bar */}
        <View style={styles.brandRow}>
          <View style={styles.leftBrand}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
              </TouchableOpacity>
            ) : showLogo ? (
              <Image
                source={require("../../../assets/Logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.textColumn}>
              <Text style={styles.govText} numberOfLines={1} ellipsizeMode="tail">
                GOVERNMENT OF GUJARAT
              </Text>
              <Text style={styles.sagText} numberOfLines={1} ellipsizeMode="tail">
                Sports Authority of Gujarat (SAG)
              </Text>
            </View>
          </View>

          <View style={styles.rightActions}>
            {roleInfo && (
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.badgeBg }]}>
                <Text style={[styles.roleBadgeText, { color: roleInfo.badgeColor }]}>
                  {roleInfo.roleCode}
                </Text>
              </View>
            )}

            {rightAction}

            {onLogout && (
              <TouchableOpacity onPress={onLogout} style={styles.logoutButton} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={17} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Title Bar - Wrapped and flexible to prevent screen clipping */}
        <View style={styles.titleRow}>
          <View style={styles.titleTextContainer}>
            <Text style={styles.screenTitle} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.screenSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : null}
          </View>

          {roleInfo && (
            <Text style={styles.roleSubtext} numberOfLines={1} ellipsizeMode="tail">
              {roleInfo.label}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.brand.dark,
  },
  headerContainer: {
    backgroundColor: colors.brand.dark,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  leftBrand: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  logoImage: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  textColumn: {
    flex: 1,
    justifyContent: "center",
  },
  govText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gov.accent,
    letterSpacing: 0.6,
  },
  sagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  logoutButton: {
    padding: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 2,
    gap: 8,
  },
  titleTextContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 11,
    color: colors.brand.light,
    marginTop: 1,
  },
  roleSubtext: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    flexShrink: 0,
  },
});

export default SagHeader;
