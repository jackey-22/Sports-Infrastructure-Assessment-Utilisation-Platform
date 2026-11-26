import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const SPORT_EMOJI = {
  Cricket: "🏏",
  Football: "⚽",
  Basketball: "🏀",
  Badminton: "🏸",
  "Athletics & Track": "🏃",
  Swimming: "🏊",
  Kabaddi: "🤼",
  "Lawn Tennis": "🎾",
  Volleyball: "🏐",
  "Table Tennis": "🏓",
};

function conditionColor(facility) {
  const score = Number(facility.condition?.score || 0);
  if (score >= 85) return "#007D40";
  if (score >= 70) return "#0d9488";
  if (score >= 55) return "#d97706";
  return "#dc2626";
}

export default function FacilityMap({ facilities = [], onSelect, userLocation = null, onRequestNearby }) {
  const webViewRef = useRef(null);
  const validFacilities = facilities.filter(
    (facility) =>
      Number.isFinite(Number(facility.latitude)) &&
      Number.isFinite(Number(facility.longitude))
  );
  const data = useMemo(
    () =>
      validFacilities.map((facility) => ({
        ...facility,
        latitude: Number(facility.latitude),
        longitude: Number(facility.longitude),
        markerColor: conditionColor(facility),
        emoji: SPORT_EMOJI[facility.sports?.[0]?.name] || "📍",
      })),
    [validFacilities]
  );

  useEffect(() => {
    if (userLocation && webViewRef.current) {
      const { latitude, longitude } = userLocation;
      webViewRef.current.injectJavaScript(
        `window.setUserLocation && window.setUserLocation(${Number(latitude)}, ${Number(longitude)}); true;`
      );
    }
  }, [userLocation]);

  const html = useMemo(() => {
    const serialized = JSON.stringify(data).replace(/</g, "\\u003c");
    const userLocJson = userLocation ? JSON.stringify(userLocation) : "null";
    return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3, user-scalable=yes">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html, body, #map { height: 100%; width: 100%; margin: 0; touch-action: pan-x pan-y pinch-zoom; }
body { overflow: hidden; font-family: system-ui, sans-serif; }
.marker { color: #fff; font-weight: 800; font-size: 11px; padding: 6px 10px;
  border: 2.5px solid #fff; border-radius: 9999px; white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0,125,64,.28); }
.user-dot { width: 16px; height: 16px; border-radius: 9999px; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(37,99,235,.22); }
.leaflet-popup-content { min-width: 190px; }
.title { color: #0B3D2E; font-weight: 800; font-size: 14px; }
.muted { color: #64748b; font-size: 11px; margin-top: 3px; }
.details { color: #007D40; font-weight: 800; font-size: 11px; margin-top: 9px; cursor: pointer; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const facilities = ${serialized};
const initialUser = ${userLocJson};
const map = L.map("map", {
  center: [22.45, 71.9],
  zoom: 7,
  minZoom: 5,
  maxZoom: 18,
  zoomSnap: 0.5,
  zoomDelta: 1,
  zoomControl: false,
  touchZoom: true,
  scrollWheelZoom: true,
  doubleClickZoom: true
});
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
const bounds = [];
facilities.forEach((facility) => {
  const shortName = (facility.name || "").replace("Sports Complex", "").replace("District Sports Ground", "").replace("Sports Ground", "").trim();
  const label = shortName.slice(0, 16) + (shortName.length > 16 ? "…" : "");
  const icon = L.divIcon({
    className: "",
    html: '<div class="marker" style="background:' + facility.markerColor + '">' + facility.emoji + ' ' + label + '</div>',
    iconSize: [120, 36],
    iconAnchor: [60, 36]
  });
  const distText = typeof facility.distanceKm === "number" ? ' · ' + facility.distanceKm.toFixed(1) + ' km away' : '';
  const marker = L.marker([facility.latitude, facility.longitude], { icon }).addTo(map);
  marker.bindPopup(
    '<div class="title">' + (facility.name || "Sports facility") + '</div>' +
    '<div class="muted">' + (facility.district || "Gujarat") + distText + '</div>' +
    '<div class="muted">' + (facility.condition?.grade || "Not assessed") + ' · FCI ' + (facility.condition?.score ?? "-") + '</div>' +
    '<div class="details" onclick="window.ReactNativeWebView.postMessage(\\'' + String(facility.id) + '\\')">Tap to view &amp; book →</div>'
  );
  marker.on("click", () => { marker.openPopup(); });
  bounds.push([facility.latitude, facility.longitude]);
});

let userMarker = null;
window.setUserLocation = (lat, lng) => {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], {
    icon: L.divIcon({ className: "", html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
  }).addTo(map).bindPopup('<div class="title">Your Location</div>');
  map.flyTo([lat, lng], 12, { duration: 0.6 });
};

window.fitAllMarkers = () => {
  if (bounds.length) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  else map.setView([22.45, 71.9], 7);
};

window.zoomInMap = () => map.setZoom(Math.min(18, map.getZoom() + 1));
window.zoomOutMap = () => map.setZoom(Math.max(5, map.getZoom() - 1));

if (initialUser) {
  window.setUserLocation(initialUser.latitude, initialUser.longitude);
} else if (bounds.length) {
  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
}
</script>
</body>
</html>`;
  }, [data]);

  const handleMessage = (event) => {
    const value = event.nativeEvent.data;
    const facility = validFacilities.find((item) => String(item.id) === value);
    if (facility) onSelect(facility);
  };

  const runJs = (fn) => {
    webViewRef.current?.injectJavaScript(`${fn}; true;`);
  };

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        allowsInlineMediaPlayback
        style={styles.webView}
      />

      {/* Reliable Native Map Controls */}
      <View style={styles.controlsCol}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zoom in map"
          style={styles.ctrlBtn}
          activeOpacity={0.75}
          onPress={() => runJs("window.zoomInMap && window.zoomInMap()")}
        >
          <Ionicons name="add" size={20} color="#0B3D2E" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zoom out map"
          style={styles.ctrlBtn}
          activeOpacity={0.75}
          onPress={() => runJs("window.zoomOutMap && window.zoomOutMap()")}
        >
          <Ionicons name="remove" size={20} color="#0B3D2E" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Fit all facilities on map"
          style={styles.ctrlBtn}
          activeOpacity={0.75}
          onPress={() => runJs("window.fitAllMarkers && window.fitAllMarkers()")}
        >
          <Ionicons name="scan-outline" size={18} color="#0B3D2E" />
        </TouchableOpacity>
        {onRequestNearby && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Find nearby facilities"
            style={[styles.ctrlBtn, userLocation && styles.ctrlBtnActive]}
            activeOpacity={0.75}
            onPress={onRequestNearby}
          >
            <Ionicons name="locate" size={18} color={userLocation ? "#ffffff" : "#007D40"} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 380,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8E5DD",
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: "#eef1eb",
  },
  controlsCol: {
    position: "absolute",
    right: 12,
    bottom: 14,
    gap: 8,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ctrlBtnActive: {
    backgroundColor: "#007D40",
    borderColor: "#007D40",
  },
});
