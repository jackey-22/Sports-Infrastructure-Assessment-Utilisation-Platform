import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
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
};

function conditionColor(facility) {
  const score = Number(facility.condition?.score || 0);
  if (score >= 85) return "#007D40";
  if (score >= 70) return "#0d9488";
  if (score >= 55) return "#d97706";
  return "#dc2626";
}

export default function FacilityMap({ facilities = [], onSelect }) {
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
    [facilities]
  );

  const html = useMemo(() => {
    const serialized = JSON.stringify(data).replace(/</g, "\\u003c");
    return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html, body, #map { height: 100%; margin: 0; }
body { overflow: hidden; font-family: system-ui, sans-serif; }
.leaflet-control-layers { border-radius: 10px; }
.marker { color: #fff; font-weight: 800; font-size: 11px; padding: 6px 10px;
  border: 2.5px solid #fff; border-radius: 9999px; white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0,125,64,.28); }
.leaflet-popup-content { min-width: 190px; }
.title { color: #0B3D2E; font-weight: 800; font-size: 14px; }
.muted { color: #64748b; font-size: 11px; margin-top: 3px; }
.details { color: #007D40; font-weight: 800; font-size: 11px; margin-top: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const facilities = ${serialized};
const layers = {
  Clean: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: "&copy; CARTO" }),
  Streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }),
  Satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "&copy; Esri" })
};
const map = L.map("map", { center: [22.45, 71.9], zoom: 7.4, minZoom: 6, maxZoom: 18, layers: [layers.Streets] });
L.control.layers(layers, null, { position: "topleft", collapsed: false }).addTo(map);
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
  const marker = L.marker([facility.latitude, facility.longitude], { icon }).addTo(map);
  marker.bindPopup(
    '<div class="title">' + (facility.name || "Sports facility") + '</div>' +
    '<div class="muted">' + (facility.district || "Gujarat") + '</div>' +
    '<div class="muted">' + (facility.condition?.grade || "Not assessed") + ' · FCI ' + (facility.condition?.score ?? "-") + '</div>' +
    '<div class="details">Tap here for details and booking</div>'
  );
  marker.on("click", () => window.ReactNativeWebView.postMessage(String(facility.id)));
  bounds.push([facility.latitude, facility.longitude]);
});
if (bounds.length) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
map.on("locationfound", (event) => map.flyTo(event.latlng, 13));
map.on("locationerror", () => window.ReactNativeWebView.postMessage("__location_error__"));
window.locateMe = () => map.locate({ setView: true, maxZoom: 13, enableHighAccuracy: true });
</script>
</body>
</html>`;
  }, [data]);

  const handleMessage = (event) => {
    const value = event.nativeEvent.data;
    if (value === "__location_error__") return;
    const facility = validFacilities.find((item) => String(item.id) === value);
    if (facility) onSelect(facility);
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
        allowsInlineMediaPlayback
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 360, borderRadius: 18, overflow: "hidden" },
  webView: { flex: 1, backgroundColor: "#eef1eb" },
});
