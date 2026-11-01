import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, Compass, ZoomIn, ZoomOut } from "lucide-react";

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const getGradeColor = (grade) => {
  if (grade.includes("Grade A")) return "#059669"; // Emerald 600
  if (grade.includes("Grade B")) return "#2563eb"; // Royal Blue 600
  if (grade.includes("Grade C")) return "#d97706"; // Amber 600
  return "#dc2626"; // Crimson Red 600
};

const TILE_LAYERS = {
  osm: {
    name: "Detailed GIS Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors | SAG Gujarat'
  },
  satellite: {
    name: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar &bull; SAG Gujarat'
  },
  voyager: {
    name: "Clean Street",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; CARTO | SAG GIS'
  }
};

export default function GujaratGisMap({
  facilities = [],
  selectedFacility = null,
  onSelectFacility = () => {},
  onOpenBooking = () => {},
  onOpenAssessment = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const [activeTile, setActiveTile] = useState("osm");

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
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
    }

    return () => {};
  }, []);

  // Handle Tile Switching
  const handleTileChange = (tileKey) => {
    setActiveTile(tileKey);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(TILE_LAYERS[tileKey].url, {
      attribution: TILE_LAYERS[tileKey].attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

  // Sync Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    facilities.forEach((facility) => {
      const color = getGradeColor(facility.condition.grade);
      const isSelected = selectedFacility?.id === facility.id;

      // Custom SVG Marker with Clean High Contrast Styling
      const markerHtml = `
        <div class="custom-gis-marker" style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: ${isSelected ? "scale(1.12)" : "scale(1)"};">
          <div style="
            background: ${color};
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-weight: 800;
            font-size: 11px;
            padding: 5px 10px;
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
          ">
            <span style="font-size: 11px;">🏟️</span>
            <span>${facility.name.replace("Sports Complex", "").replace("District Sports Ground", "").trim()}</span>
            <span style="background: rgba(255,255,255,0.3); border-radius: 5px; padding: 1px 5px; font-size: 10px; font-weight: 800;">${facility.condition.score}%</span>
          </div>
          <!-- Pointer arrow -->
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0; 
            height: 0; 
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid ${color};
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: markerHtml,
        iconSize: [120, 34],
        iconAnchor: [60, 34],
      });

      const marker = L.marker([facility.latitude, facility.longitude], {
        icon: customIcon,
      }).addTo(map);

      // High-Contrast Popup Content
      const popupHtml = `
        <div style="min-width: 260px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a;">
          <div style="position: relative; height: 95px; margin: -14px -16px 10px -16px; overflow: hidden;">
            <img src="${facility.picture}" style="width: 100%; height: 100%; object-fit: cover;" alt="${facility.name}" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 60%);"></div>
            <div style="position: absolute; bottom: 8px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: rgba(255,255,255,0.9); color: #0f172a; padding: 2px 7px; border-radius: 6px;">
                ${facility.district} • ${facility.taluka}
              </span>
              <span style="font-size: 11px; font-weight: 800; background: ${color}; color: #ffffff; padding: 2px 7px; border-radius: 6px;">
                FCI ${facility.condition.score}%
              </span>
            </div>
          </div>

          <h4 style="margin: 0 0 3px 0; font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.3;">
            ${facility.name}
          </h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569; font-weight: 500;">
            ${facility.location}
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px;">
            <div><span style="color: #64748b;">Utilisation:</span> <strong style="color: #0f172a;">${facility.utilisation.utilizationRate}%</strong></div>
            <div><span style="color: #64748b;">Daily Cap:</span> <strong style="color: #0f172a;">${facility.utilisation.capacityDaily}</strong></div>
          </div>

          <div style="font-size: 11px; color: #334155; margin-bottom: 10px;">
            <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">Available Sports</div>
            <div style="font-weight: 600; color: #0f172a;">${facility.sports.map(s => s.name).join(" • ")}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button id="btn-inspect-${facility.id}" style="background: #0284c7; color: #ffffff; border: none; border-radius: 8px; padding: 7px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
              FCI Audit
            </button>
            <button id="btn-book-${facility.id}" style="background: #16a34a; color: #ffffff; border: none; border-radius: 8px; padding: 7px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
              Book Slot
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        onSelectFacility(facility);
        const btnInspect = document.getElementById(`btn-inspect-${facility.id}`);
        const btnBook = document.getElementById(`btn-book-${facility.id}`);
        if (btnInspect) btnInspect.onclick = () => onOpenAssessment(facility);
        if (btnBook) btnBook.onclick = () => onOpenBooking(facility);
      });

      marker.on("click", () => {
        onSelectFacility(facility);
      });

      markersRef.current[facility.id] = marker;
    });

    if (facilities.length > 0) {
      const bounds = L.latLngBounds(facilities.map(f => [f.latitude, f.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [facilities]);

  // Center on selected facility
  useEffect(() => {
    if (selectedFacility && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedFacility.latitude, selectedFacility.longitude],
        13,
        { duration: 1.0 }
      );
      const marker = markersRef.current[selectedFacility.id];
      if (marker) {
        setTimeout(() => marker.openPopup(), 300);
      }
    }
  }, [selectedFacility]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([22.45, 71.9], 7.4, { duration: 1 });
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      {/* Map Container */}
      <div
        id="gujarat-gis-map"
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ minHeight: "560px" }}
      />

      {/* Top Floating GIS Layer Controls (Clean White Slate Pills) */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md">
        {Object.entries(TILE_LAYERS).map(([key, item]) => (
          <button
            key={key}
            onClick={() => handleTileChange(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTile === key
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {item.name}
          </button>
        ))}
      </div>

      {/* Zoom & Quick Reset Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-1 flex flex-col shadow-md">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-200 my-0.5"></div>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetView}
          className="bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 text-slate-700 hover:text-blue-600 shadow-md flex items-center justify-center transition"
          title="Reset Gujarat Bounds"
        >
          <Compass className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Floating Bottom FCI Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-md border border-slate-200 text-xs text-slate-800 max-w-[240px]">
        <div className="font-extrabold text-slate-900 mb-2 flex items-center gap-1.5 tracking-tight">
          <span>🛡️</span> Facility Condition Index (FCI)
        </div>
        <div className="space-y-1.5 font-medium text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs"></span>
              Grade A: Excellent
            </span>
            <span className="font-bold text-emerald-700">&gt;85%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs"></span>
              Grade B: Good
            </span>
            <span className="font-bold text-blue-700">70-84%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-xs"></span>
              Grade C: Needs Repair
            </span>
            <span className="font-bold text-amber-700">55-69%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-xs"></span>
              Grade D: Critical
            </span>
            <span className="font-bold text-red-700">&lt;55%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
