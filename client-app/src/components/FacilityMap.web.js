import React from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import { Text } from "./AppText";
export default function FacilityMap({ facilities, onSelect, onRequestNearby }) {
  return (
    <View style={{ backgroundColor: "#E9F5EE", padding: 16, borderRadius: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700" }}>Facility locations</Text>
        {onRequestNearby ? (
          <TouchableOpacity onPress={onRequestNearby}>
            <Text style={{ color: "#007D40", fontWeight: "700", fontSize: 12 }}>Use my location</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {facilities.map((f) => (
        <View key={f.id} style={{ marginBottom: 6 }}>
          <TouchableOpacity onPress={() => onSelect(f)}>
            <Text style={{ fontWeight: "700" }}>
              {f.name}
              {typeof f.distanceKm === "number" ? ` (${f.distanceKm.toFixed(1)} km)` : ""}
            </Text>
          </TouchableOpacity>
          {Number.isFinite(f.latitude) && Number.isFinite(f.longitude) && (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`)
              }
            >
              <Text style={{ color: "#007D40", paddingVertical: 6 }}>Open map →</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}
