import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, Crosshair, ZoomIn, ZoomOut } from "lucide-react";
import { getConditionMeta } from "./exploreUtils";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const getGradeColor = (grade = "", score = 0) => {
  if (grade.includes("Grade A") || score >= 85) return "#007D40";
  if (grade.includes("Grade B") || score >= 70) return "#0d9488";
  if (grade.includes("Grade C") || score >= 55) return "#d97706";
  return "#dc2626";
};

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

const TILE_LAYERS = {
  voyager: {
    name: "Clean",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO | SAG GIS",
  },
  osm: {
    name: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap | SAG Gujarat",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri | SAG Gujarat",
  },
};

export default function GujaratGisMap({
  facilities = [],
  selectedFacility = null,
  onSelectFacility = () => {},
  onOpenBooking = () => {},
  onOpenAssessment = () => {},
  onViewDetails = () => {},
  onLocateResult = () => {},
  onClearFilters = () => {},
  openPopupOnSelect = false,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const [activeTile, setActiveTile] = useState("osm");
  const [layersOpen, setLayersOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.45, 71.9],
      zoom: 7.4,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
    });

    const initialLayer = L.tileLayer(TILE_LAYERS.osm.url, {
      attribution: TILE_LAYERS.osm.attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = initialLayer;
    mapInstanceRef.current = map;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleTileChange = (tileKey) => {
    setActiveTile(tileKey);
    setLayersOpen(false);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(TILE_LAYERS[tileKey].url, {
      attribution: TILE_LAYERS[tileKey].attribution,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = newLayer;
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    facilities.forEach((facility) => {
      const color = getGradeColor(facility.condition?.grade, facility.condition?.score);
      const isSelected = selectedFacility?.id === facility.id;
      const primarySport = facility.sports?.[0]?.name;
      const emoji = SPORT_EMOJI[primarySport] || "📍";
      const shortName = facility.name
        .replace("Sports Complex", "")
        .replace("District Sports Ground", "")
        .replace("Sports Ground", "")
        .trim();

      const markerHtml = `
        <div class="custom-gis-marker" style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:${
          isSelected ? "scale(1.12)" : "scale(1)"
        };">
          <div style="
            background:${isSelected ? "#007D40" : color};
            color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:11px;
            padding:6px 10px;border-radius:9999px;box-shadow:0 4px 14px rgba(0,125,64,0.28);
            border:2.5px solid #fff;white-space:nowrap;display:flex;align-items:center;gap:5px;
          ">
            <span style="font-size:12px;">${emoji}</span>
            <span>${shortName.slice(0, 16)}${shortName.length > 16 ? "…" : ""}</span>
          </div>
          <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${
            isSelected ? "#007D40" : color
          };"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: markerHtml,
        iconSize: [120, 36],
        iconAnchor: [60, 36],
      });

      const marker = L.marker([facility.latitude, facility.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      const condition = getConditionMeta(facility);
      const popupHtml = `
        <div style="min-width:220px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0B3D2E;">
          <div style="position:relative;height:80px;margin:-14px -16px 10px -16px;overflow:hidden;">
            <img src="${facility.picture}" style="width:100%;height:100%;object-fit:cover;" alt="" />
            <span style="position:absolute;top:8px;right:8px;font-size:10px;font-weight:800;background:${color};color:#fff;padding:3px 8px;border-radius:9999px;">
              ${condition.label}
            </span>
          </div>
          <h4 style="margin:0 0 2px;font-size:14px;font-weight:800;line-height:1.3;">${facility.name}</h4>
          <p style="margin:0 0 8px;font-size:11px;color:#64748b;">${facility.district}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <button id="btn-details-${facility.id}" style="background:#007D40;color:#fff;border:none;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:700;cursor:pointer;">Details</button>
            <button id="btn-book-${facility.id}" style="background:#E8F5EE;color:#007D40;border:1px solid #D1FAE5;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:700;cursor:pointer;">Book</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on("popupopen", () => {
        onSelectFacility(facility);
        const d = document.getElementById(`btn-details-${facility.id}`);
        const b = document.getElementById(`btn-book-${facility.id}`);
        if (d) d.onclick = () => onViewDetails(facility);
        if (b) b.onclick = () => onOpenBooking(facility);
      });
      marker.on("click", () => {
        onSelectFacility(facility);
      });
      markersRef.current[facility.id] = marker;
    });

    if (facilities.length > 0 && !selectedFacility) {
      const bounds = L.latLngBounds(
        facilities.map((f) => [f.latitude, f.longitude])
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, selectedFacility?.id]);

  useEffect(() => {
    if (!selectedFacility || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markersRef.current[selectedFacility.id];
    map.panTo([selectedFacility.latitude, selectedFacility.longitude], {
      animate: true,
      duration: 0.6,
    });
    if (openPopupOnSelect && marker) {
      setTimeout(() => marker.openPopup(), 200);
    }
  }, [selectedFacility, openPopupOnSelect]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      onLocateResult({ ok: false, message: "Geolocation not supported on this device." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1 });
        if (userMarkerRef.current) {
          mapInstanceRef.current.removeLayer(userMarkerRef.current);
        }
        userMarkerRef.current = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: "#007D40",
          fillColor: "#34d399",
          fillOpacity: 0.9,
          weight: 2,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup("You are here")
          .openPopup();
        onLocateResult({ ok: true, message: "Location on — showing nearby area." });
      },
      () => {
        setLocating(false);
        onLocateResult({
          ok: false,
          message: "Couldn't get location — try again or pick a district.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 ${className}`}
    >
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "360px" }} />

      {facilities.length === 0 && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/70 backdrop-blur-[1px] p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-center max-w-xs">
            <p className="font-extrabold text-brand-dark">No venues match</p>
            <p className="text-xs text-slate-500 mt-1">
              Clear filters to see sports facilities across Gujarat again.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 text-xs font-bold text-brand-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 z-[1000]">
        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 text-slate-700 shadow-sm hover:bg-brand-soft transition inline-flex items-center gap-1.5 text-xs font-bold"
        >
          <Layers className="w-3.5 h-3.5 text-brand-primary" />
          Layers
        </button>
        {layersOpen && (
          <div className="mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg p-1 min-w-[120px]">
            {Object.entries(TILE_LAYERS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTileChange(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition ${
                  activeTile === key
                    ? "bg-brand-soft text-brand-primary"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLocateMe}
          className="bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 text-brand-primary shadow-sm hover:bg-brand-soft transition"
          title="Locate me"
        >
          <Crosshair className={`w-4 h-4 ${locating ? "animate-pulse" : ""}`} />
        </button>
        <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-0.5 flex flex-col shadow-sm">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 text-slate-700 hover:text-brand-primary hover:bg-brand-soft rounded-lg transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 text-slate-700 hover:text-brand-primary hover:bg-brand-soft rounded-lg transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
