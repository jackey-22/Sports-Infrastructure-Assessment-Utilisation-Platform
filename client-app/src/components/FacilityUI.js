import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "./AppText";
export const GREEN = "#007D40";
export function FacilityHeader({ title, subtitle, onBack, children }) {
  return <View style={ui.hero}><View style={ui.brandRow}>{onBack && <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={ui.iconButton}><Ionicons name="arrow-back" size={23} color="white" /></TouchableOpacity>}<Image source={require("../../assets/Logo.png")} style={{ width: 41, height: 41 }} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={ui.gov}>Government of Gujarat</Text><Text style={ui.sag}>Sports Authority of Gujarat (SAG)</Text></View>{children}</View><MaterialCommunityIcons name="stadium" size={105} color="rgba(127,220,166,0.16)" style={ui.stadium} /><Text style={ui.heroTitle}>{title}</Text>{!!subtitle && <Text style={ui.heroSubtitle}>{subtitle}</Text>}<View style={ui.heroLine} /></View>;
}
export function Chip({ children, active, onPress }) { return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[ui.chip, active && ui.chipActive]}><Text style={[ui.chipText, active && { color: "white" }]}>{children}</Text></TouchableOpacity>; }
export function Button({ children, onPress, disabled, secondary }) { return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[ui.button, secondary && { backgroundColor: "#E8F5EE" }, disabled && { opacity: 0.5 }]}><Text style={[ui.buttonText, secondary && { color: GREEN }]}>{children}</Text></TouchableOpacity>; }
export function StateMessage({ title, message, action, onAction }) { return <View style={ui.state}><Ionicons name="search-outline" size={30} color={GREEN} /><Text style={ui.sectionTitle}>{title}</Text><Text style={ui.muted}>{message}</Text>{action && <Button onPress={onAction}>{action}</Button>}</View>; }
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F8F6" }, safe: { flex: 1, backgroundColor: "#084733" },
  hero: { backgroundColor: "#084733", padding: 20, paddingTop: 14, paddingBottom: 27, overflow: "hidden" },
  brandRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 20 }, gov: { color: "white", fontSize: 11, fontWeight: "700" }, sag: { color: "#C9E3D5", fontSize: 9, marginTop: 3 },
  heroTitle: { fontSize: 26, lineHeight: 33, color: "white", fontWeight: "800", letterSpacing: -0.8 }, heroSubtitle: { color: "#C9E3D5", fontSize: 12, lineHeight: 20, marginTop: 5 },
  stadium: { position: "absolute", right: 8, bottom: 5 }, heroLine: { position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: "#62C68E" },
  iconButton: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14, paddingBottom: 30 }, card: { backgroundColor: "white", borderRadius: 19, padding: 17, borderWidth: 1, borderColor: "#E3EBE6" },
  sectionTitle: { color: "#193B2A", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 }, muted: { color: "#748379", fontSize: 11, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, backgroundColor: "white", borderWidth: 1, borderColor: "#E0E9E3" }, chipActive: { backgroundColor: GREEN, borderColor: GREEN }, chipText: { color: "#34523F", fontSize: 11, fontWeight: "600" },
  button: { backgroundColor: GREEN, paddingHorizontal: 17, paddingVertical: 14, borderRadius: 13, alignItems: "center", justifyContent: "center" }, buttonText: { fontSize: 12, fontWeight: "700", color: "white", textAlign: "center" },
  state: { padding: 28, alignItems: "center", gap: 14 }, input: { backgroundColor: "#F7FAF8", borderWidth: 1, borderColor: "#E0E9E3", borderRadius: 12, padding: 13, color: "#193B2A", fontSize: 13 }, label: { fontSize: 11, fontWeight: "700", color: "#34523F", marginBottom: 7 },
  badge: { alignSelf: "flex-start", backgroundColor: "#E0F7E6", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, badgeText: { color: GREEN, fontWeight: "700", fontSize: 10 }, error: { color: "#B42318", fontSize: 12, lineHeight: 19 },
});
