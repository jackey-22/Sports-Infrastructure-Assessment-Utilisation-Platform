import React from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import { Text } from "./AppText";
export default function FacilityMap({ facilities, onSelect }) {
  return <View style={{ backgroundColor: "#E9F5EE", padding: 16, borderRadius: 16 }}><Text style={{ fontWeight: "700", marginBottom: 12 }}>Facility locations</Text>{facilities.map(f => <View key={f.id} style={{ marginBottom: 14 }}><TouchableOpacity onPress={() => onSelect(f)}><Text>{f.name}</Text></TouchableOpacity>{Number.isFinite(f.latitude) && Number.isFinite(f.longitude) && <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`)}><Text style={{ color: "#007D40", paddingVertical: 8 }}>Open map →</Text></TouchableOpacity>}</View>)}</View>;
}
