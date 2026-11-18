import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Text } from "../AppText";
export const HEADER_GREEN = "#073D2D";
export const APP_BACKGROUND = "#F3F6F9";
export const headerTokens = Object.freeze({
  gutter: 18,
  actionSize: 44,
  logoSize: 40,
  titleSize: 28,
  compactTitleSize: 24,
  waveHeight: 34
});
export function HeaderAction({
  label,
  icon,
  onPress,
  disabled = false
}) {
  if (typeof onPress !== "function") return null;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{
    disabled
  }} onPress={onPress} disabled={disabled} hitSlop={4} style={[styles.action, disabled && styles.disabled]}><Ionicons name={icon} size={23} color="white" /></TouchableOpacity>;
}
export default function AppHeader({
  title,
  subtitle,
  onBack,
  onLogout,
  actions = [],
  variant = "standard"
}) {
  const compact = variant === "compact";
  return <LinearGradient colors={[HEADER_GREEN, "#005234"]} start={{
    x: 0,
    y: 0
  }} end={{
    x: 1,
    y: 1
  }} style={[styles.header, compact && styles.compact]}>
    <View style={styles.brandRow}>
      {typeof onBack === "function" ? <HeaderAction label="Go back" icon="arrow-back" onPress={onBack} /> : <View accessible={false} style={styles.actionSlot} />}
      <Image accessible={false} source={require("../../../assets/Logo.png")} resizeMode="contain" style={styles.logo} />
      <View style={styles.brandCopy}><Text style={styles.government}>Government of Gujarat</Text><Text style={styles.brand}>Sports Authority of Gujarat (SAG)</Text></View>
      {(actions.some(action => typeof action.onPress === "function") || typeof onLogout === "function") && <View style={styles.actions}>{actions.map(action => <HeaderAction key={action.key || action.label} {...action} />)}<HeaderAction label="Sign out" icon="power-outline" onPress={onLogout} /></View>}
    </View>
    <View style={styles.titleBlock}><Text accessibilityRole="header" numberOfLines={2} ellipsizeMode="tail" style={[styles.title, compact && styles.compactTitle]}>{title}</Text>{!!subtitle && <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text>}</View>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.artwork, compact && styles.compactArtwork]}><MaterialCommunityIcons name="stadium-variant" size={115} color="rgba(125,222,153,0.25)" /></View>
    <View pointerEvents="none" accessible={false} style={styles.wave}><Svg accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" width="100%" height={headerTokens.waveHeight} viewBox="0 0 430 39" preserveAspectRatio="none"><Path d="M0 29 Q100 44 230 16 T430 19 L430 39 L0 39Z" fill="#86D3A4" /><Path d="M185 39 Q295 -10 430 21 L430 39Z" fill="#0A9852" /><Path d="M0 26 Q122 40 260 27 T430 32 L430 39 L0 39Z" fill={APP_BACKGROUND} /></Svg></View>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: headerTokens.gutter,
    paddingTop: 12,
    paddingBottom: 43,
    backgroundColor: HEADER_GREEN,
    overflow: "hidden"
  },
  compact: {
    paddingBottom: 36
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    zIndex: 1
  },
  action: {
    width: headerTokens.actionSize,
    minHeight: headerTokens.actionSize,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  actionSlot: {
    width: headerTokens.actionSize,
    minHeight: headerTokens.actionSize
  },
  disabled: {
    opacity: 0.45
  },
  logo: {
    width: headerTokens.logoSize,
    height: headerTokens.logoSize,
    borderRadius: 20,
    backgroundColor: "white"
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  government: {
    color: "#E2F1E7",
    fontSize: 11,
    fontWeight: "500"
  },
  brand: {
    color: "white",
    fontSize: 12,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 5,
    maxWidth: 93
  },
  titleBlock: {
    marginTop: 16,
    gap: 5,
    zIndex: 1
  },
  title: {
    fontSize: headerTokens.titleSize,
    fontWeight: "800",
    color: "white"
  },
  compactTitle: {
    fontSize: headerTokens.compactTitle
  },
  subtitle: {
    fontSize: 12,
    color: "#DEEEE3"
  },
  artwork: {
    position: "absolute",
    right: 12,
    bottom: 8,
    transform: [{
      rotate: "-5deg"
    }]
  },
  compactArtwork: {
    opacity: 0.55
  },
  wave: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: headerTokens.waveHeight
  }
});
