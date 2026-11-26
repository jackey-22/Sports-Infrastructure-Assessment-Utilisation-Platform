import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, ActivityIndicator, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../../components/AppText";
import FacilityMap from "../../components/FacilityMap";
import { Chip, Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import { loadFacilities, imageUrl, timingLabel, AMENITIES } from "../../services/facilityService";
import ComplexDetailScreen from "./ComplexDetailScreen";
import CitizenRatingModal from "../../components/citizen/CitizenRatingModal";
export default function GujaratExploreMapScreen({
  onSelectFacility,
  onBack,
  canRate = false
}) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [sport, setSport] = useState("");
  const [grade, setGrade] = useState("");
  const [purpose, setPurpose] = useState("");
  const [audience, setAudience] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [minRating, setMinRating] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [sort, setSort] = useState("name");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    districts: [],
    sports: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [viewMode, setViewMode] = useState("list"); // "map" | "list" | "stats"
  const [panel, setPanel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [ratingFacility, setRatingFacility] = useState(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem("facilityFavorites").then(value => {
      if (alive && value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) setFavorites(parsed);
        } catch {}
      }
    }).catch(() => {}).finally(() => {
      if (alive) setFavoritesReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (favoritesReady) AsyncStorage.setItem("facilityFavorites", JSON.stringify(favorites)).catch(() => {});
  }, [favorites, favoritesReady]);
  const toggleFavorite = id => setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => loadFacilities({
      bookableOnly: true,
      q,
      district,
      sport,
      grade,
      purpose,
      audience,
      maxPrice,
      hasSubscription: hasSubscription ? "true" : "",
      minRating: minRating ? "4" : "",
      amenities: amenities.join(","),
      sort
    }).then(result => {
      if (alive) {
        setRows(result.data || []);
        setMeta(result.meta || {
          districts: [],
          sports: []
        });
      }
    }).catch(err => {
      if (alive) {
        setError(err.message);
        setRows([]);
      }
    }).finally(() => {
      if (alive) setLoading(false);
    }), 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, district, sport, grade, purpose, audience, maxPrice, hasSubscription, minRating, amenities, sort, revision]);
  const reset = () => {
    setQ("");
    setDistrict("");
    setSport("");
    setGrade("");
    setPurpose("");
    setAudience("");
    setMaxPrice("");
    setHasSubscription(false);
    setMinRating(false);
    setAmenities([]);
    setSavedOnly(false);
  };
  const select = facility => onSelectFacility ? onSelectFacility(facility) : setPreview(facility);
  const visible = savedOnly ? rows.filter(f => favorites.includes(String(f.id))) : rows;
  const activeCount = Number(!!district) + Number(!!sport) + Number(!!grade) + Number(!!purpose) + Number(!!audience) + Number(!!maxPrice) + Number(hasSubscription) + Number(minRating) + amenities.length + Number(savedOnly);
  if (preview) return <ComplexDetailScreen facility={preview} canRate={canRate} onBack={() => setPreview(null)} />;
  const options = (values, current, setter, all) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}><Chip active={!current} onPress={() => setter("")}>{all}</Chip>{values.map(value => <Chip key={value} active={current === value} onPress={() => setter(current === value ? "" : value)}>{value}</Chip>)}</ScrollView>;

  const sportBreakdown = Object.entries(
    visible.reduce((acc, fac) => {
      (fac.sports || []).forEach((sp) => {
        if (sp.name) acc[sp.name] = (acc[sp.name] || 0) + 1;
      });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const avgCondition = (() => {
    const scores = visible.map((f) => f.condition?.score).filter((v) => typeof v === "number");
    return scores.length ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null;
  })();

  return <View style={ui.safe}><View style={ui.screen}>
    <AppScreenScroll keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading && revision > 0} onRefresh={() => setRevision(v => v + 1)} tintColor={GREEN} />} header={<AppHeader title="KhelGujarat GIS Explore" subtitle="Discover sports infrastructure across Gujarat" onBack={onBack} />}>

      <View style={s.searchRow}><View style={s.search}><Ionicons name="search-outline" size={21} color={GREEN} /><TextInput accessibilityLabel="Search facilities, districts or sports" style={s.searchInput} placeholder="Search complex, district, sport..." value={q} onChangeText={setQ} autoCorrect={false} />{!!q && <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQ("")} style={ui.iconButton}><Ionicons name="close-circle" size={18} color="#789283" /></TouchableOpacity>}</View></View>
      <View style={s.viewToggleRow}>
        {[
          { id: "map", label: "Map", icon: "map-outline" },
          { id: "list", label: "List", icon: "list-outline" },
          { id: "stats", label: "Stats", icon: "stats-chart-outline" },
        ].map((tab) => {
          const active = viewMode === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setViewMode(tab.id)}
              style={[s.viewToggleBtn, active && s.viewToggleBtnActive]}
            >
              <Ionicons name={tab.icon} size={15} color={active ? "#ffffff" : GREEN} />
              <Text style={[s.viewToggleText, active && s.viewToggleTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {options(meta.districts, district, setDistrict, "All districts")}
      {options(meta.sports, sport, setSport, "All disciplines")}
      <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : visible.length}</Text><Text style={ui.muted}>Facilities</Text></View><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : new Set(visible.map(f => f.district)).size}</Text><Text style={ui.muted}>Districts</Text></View><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : new Set(visible.flatMap(f => f.sports.map(sp => sp.name))).size}</Text><Text style={ui.muted}>Sports</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => setPanel("filters")} style={s.filterButton}><Ionicons name="options-outline" size={19} color={GREEN} /><Text style={s.filterText}>Filters{activeCount ? ` (${activeCount})` : ""}</Text></TouchableOpacity></View>
      <View style={s.resultsHeading}><Text style={[ui.sectionTitle, {
            flex: 1
          }]}>Sports facilities</Text><TouchableOpacity accessibilityRole="button" onPress={() => setPanel("sort")} style={ui.row}><Text style={s.sortText}>{sort === "condition" ? "Best condition" : sort === "rating" ? "Top rated" : sort === "price" ? "Lowest price" : "Name A-Z"}</Text><Ionicons name="chevron-down" size={15} color={GREEN} /></TouchableOpacity></View>
      {loading ? <View style={ui.state}><ActivityIndicator size="large" color={GREEN} /><Text style={ui.muted}>Loading facilities...</Text></View> : error ? <StateMessage title="Could not load facilities" message={error} action="Try again" onAction={() => setRevision(v => v + 1)} /> : !visible.length ? <StateMessage title="No matching facilities" message="Try another district, sport or search term." action="Clear filters" onAction={reset} /> : <View style={s.results}>
        {viewMode === "stats" && (
          <View style={s.statsPanel}>
            <Text style={ui.sectionTitle}>Explore Insights &amp; Stats</Text>
            <Text style={[ui.muted, { marginTop: 4 }]}>Live platform metrics for the {visible.length} matching facilities.</Text>
            <View style={s.statsSummaryGrid}>
              <View style={s.statsMiniBox}><Text style={s.statsMiniVal}>{avgCondition != null ? `${avgCondition}/100` : "—"}</Text><Text style={ui.muted}>Avg Condition</Text></View>
              <View style={s.statsMiniBox}><Text style={s.statsMiniVal}>{visible.filter(f => f.hasSubscriptions).length}</Text><Text style={ui.muted}>With Subscriptions</Text></View>
            </View>
            <Text style={[ui.label, { marginTop: 14, marginBottom: 8 }]}>Facilities by Sport</Text>
            {sportBreakdown.map(([spName, count]) => (
              <View key={spName} style={{ marginBottom: 8 }}>
                <View style={[ui.row, { justifyContent: "space-between", marginBottom: 3 }]}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#173C28" }}>{spName}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>{count}</Text>
                </View>
                <View style={{ height: 7, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.max(10, Math.round((count / Math.max(1, visible.length)) * 100))}%`, backgroundColor: GREEN, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        )}
        {viewMode === "map" && <><FacilityMap facilities={visible} onSelect={select} /><Text style={ui.muted}>Tap a marker, then its name to view a facility. Only facilities with recorded coordinates appear on the map.</Text></>}
        {viewMode === "list" && visible.map(f => <View key={f.id} style={s.facilityCard}>
          <View style={s.photo}>{imageUrl(f.picture) ? <Image source={{
                uri: imageUrl(f.picture)
              }} style={s.photoImage} /> : <Ionicons name="business-outline" size={45} color="#7CA48C" />}<TouchableOpacity accessibilityRole="button" accessibilityLabel={favorites.includes(String(f.id)) ? "Remove saved facility" : "Save facility"} onPress={() => toggleFavorite(String(f.id))} style={s.heart}><Ionicons name={favorites.includes(String(f.id)) ? "heart" : "heart-outline"} size={22} color="white" /></TouchableOpacity><View style={s.photoCount}><Ionicons name="images-outline" size={13} color="white" /><Text style={s.photoCountText}>{new Set([f.picture, ...(f.gallery || []), ...(f.sports || []).flatMap(sp => sp.images || []), ...(f.conditionPhotos || []).map(cp => cp.url)].filter(Boolean)).size} photos</Text></View></View>
          <View style={s.cardBody}><Text style={s.facilityName}>{f.name}</Text><View style={[ui.row, {
                marginTop: 6
              }]}><Ionicons name="location-outline" size={14} color={GREEN} /><Text style={ui.muted}>{[f.district, f.taluka].filter(Boolean).join(", ")}</Text></View><View style={[ui.row, {
                justifyContent: "space-between",
                marginVertical: 12
              }]}><View style={ui.badge}><Text style={ui.badgeText}>{f.condition?.grade || "Not assessed"}</Text></View><Text style={s.fci}>FCI {f.condition?.score ?? "-"}/100</Text></View><View style={ui.wrap}>{AMENITIES.filter(a => f.amenities?.[a.key]).slice(0, 3).map(a => <View key={a.key} style={s.amenity}><Ionicons name={a.icon} size={14} color="#637A6D" /><Text style={s.amenityText}>{a.label}</Text></View>)}</View><View style={s.cardBottom}><View style={[ui.row, {
                  flex: 1
                }]}><Ionicons name="time-outline" size={15} color={GREEN} /><Text style={[ui.muted, {
                    flex: 1
                  }]}>{timingLabel(f)}</Text></View>{canRate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Rate ${f.name}`} onPress={() => setRatingFacility(f)} style={s.rateButton}><Ionicons name="star-outline" size={18} color="#B45309" /><Text style={s.rateButtonText}>Rate</Text></TouchableOpacity> : null}<Button onPress={() => select(f)}>View & book →</Button></View></View>
        </View>)}
      </View>}
    </AppScreenScroll>
    <Modal visible={!!panel} transparent animationType="slide" onRequestClose={() => setPanel(null)}><View style={s.backdrop}><View style={s.sheet}><View style={s.sheetHeading}><Text style={ui.sectionTitle}>{panel === "sort" ? "Sort facilities" : "Advance filters"}</Text><TouchableOpacity accessibilityLabel="Close filters" onPress={() => setPanel(null)} style={ui.iconButton}><Ionicons name="close" size={23} color={GREEN} /></TouchableOpacity></View><ScrollView contentContainerStyle={{
              gap: 16,
              paddingBottom: 16
            }}>
      {panel === "sort" ? [["name", "Name A-Z"], ["condition", "Best condition"], ["rating", "Top rated"], ["price", "Lowest starting price"]].map(([value, label]) => <Chip key={value} active={sort === value} onPress={() => {
                setSort(value);
                setPanel(null);
              }}>{label}</Chip>) : <><Text style={ui.label}>Session purpose</Text><View style={ui.wrap}>{[["", "Any"], ["coaching", "Coaching"], ["open-play", "Open play"], ["competition", "Competition"]].map(([value, label]) => <Chip key={label} active={purpose === value} onPress={() => setPurpose(value)}>{label}</Chip>)}</View><Text style={ui.label}>Batch / audience</Text><View style={ui.wrap}>{[["", "Any"], ["mixed", "Mixed"], ["women", "Women only"], ["children", "Children"], ["members", "Members"]].map(([value, label]) => <Chip key={label} active={audience === value} onPress={() => setAudience(value)}>{label}</Chip>)}</View><Text style={ui.label}>Slot budget</Text><View style={ui.wrap}>{[["", "Any"], ["150", "Up to ₹150"], ["300", "Up to ₹300"], ["500", "Up to ₹500"]].map(([value, label]) => <Chip key={label} active={maxPrice === value} onPress={() => setMaxPrice(value)}>{label}</Chip>)}</View><Text style={ui.label}>Plans &amp; quality</Text><View style={ui.wrap}><Chip active={hasSubscription} onPress={() => setHasSubscription(v => !v)}>Monthly / Yearly plans</Chip><Chip active={minRating} onPress={() => setMinRating(v => !v)}>4.0★ &amp; above</Chip><Chip active={grade === "a"} onPress={() => setGrade(grade === "a" ? "" : "a")}>Grade A condition</Chip></View><Text style={ui.label}>Required amenities</Text><View style={ui.wrap}>{AMENITIES.map(a => <Chip key={a.key} active={amenities.includes(a.key)} onPress={() => setAmenities(previous => previous.includes(a.key) ? previous.filter(v => v !== a.key) : [...previous, a.key])}>{a.label}</Chip>)}</View><Chip active={savedOnly} onPress={() => setSavedOnly(v => !v)}>Saved facilities only</Chip><Button secondary onPress={reset}>Reset all filters</Button></>}
    </ScrollView><Button onPress={() => setPanel(null)}>Show results</Button></View></View></Modal>
    <CitizenRatingModal visible={!!ratingFacility} facility={ratingFacility} onClose={() => setRatingFacility(null)} onSaved={() => setRevision(value => value + 1)} />
  </View></View>;
}
const s = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    gap: 9,
    margin: 16,
    marginTop: 15
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E0E9E3",
    borderRadius: 15,
    paddingLeft: 13
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 13,
    fontSize: 11,
    color: "#254B34"
  },
  mapButton: {
    width: 49,
    minHeight: 49,
    backgroundColor: GREEN,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  viewToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E9E3",
    backgroundColor: "white"
  },
  viewToggleBtnActive: {
    backgroundColor: GREEN,
    borderColor: GREEN
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN
  },
  viewToggleTextActive: {
    color: "white"
  },
  statsPanel: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E9E3"
  },
  statsSummaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  statsMiniBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center"
  },
  statsMiniVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173C28"
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  stats: {
    margin: 16,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E0E9E3",
    borderRadius: 16
  },
  stat: {
    flex: 1,
    alignItems: "center"
  },
  statValue: {
    color: "#173C28",
    fontSize: 20,
    fontWeight: "800"
  },
  filterButton: {
    backgroundColor: "#E0F6E6",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 3
  },
  filterText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700"
  },
  resultsHeading: {
    marginHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sortText: {
    fontSize: 10,
    fontWeight: "600",
    color: GREEN
  },
  results: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16
  },
  facilityCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1EAE4",
    overflow: "hidden",
    backgroundColor: "white"
  },
  photo: {
    height: 170,
    backgroundColor: "#E0EDE4",
    alignItems: "center",
    justifyContent: "center"
  },
  photoImage: {
    width: "100%",
    height: "100%"
  },
  heart: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "rgba(10,40,24,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  photoCount: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(10,40,24,0.6)"
  },
  photoCountText: {
    color: "white",
    fontSize: 10
  },
  cardBody: {
    padding: 15
  },
  facilityName: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    color: "#173C28",
    letterSpacing: -0.5
  },
  fci: {
    fontSize: 10,
    color: "#6C8275"
  },
  amenity: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: "#F4F7F5",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8
  },
  amenityText: {
    fontSize: 9,
    color: "#637A6D"
  },
  cardBottom: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#FFF7E6"
  },
  rateButtonText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,25,14,0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#F8FBF9",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 12
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  }
});
