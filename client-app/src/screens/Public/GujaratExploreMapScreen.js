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
export default function GujaratExploreMapScreen({
  onSelectFacility,
  onBack
}) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [sport, setSport] = useState("");
  const [grade, setGrade] = useState("");
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
  const [map, setMap] = useState(false);
  const [panel, setPanel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
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
  }, [q, district, sport, grade, amenities, sort, revision]);
  const reset = () => {
    setQ("");
    setDistrict("");
    setSport("");
    setGrade("");
    setAmenities([]);
    setSavedOnly(false);
  };
  const select = facility => onSelectFacility ? onSelectFacility(facility) : setPreview(facility);
  const visible = savedOnly ? rows.filter(f => favorites.includes(String(f.id))) : rows;
  const activeCount = Number(!!district) + Number(!!sport) + Number(!!grade) + amenities.length + Number(savedOnly);
  if (preview) return <ComplexDetailScreen facility={preview} onBack={() => setPreview(null)} />;
  const options = (values, current, setter, all) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}><Chip active={!current} onPress={() => setter("")}>{all}</Chip>{values.map(value => <Chip key={value} active={current === value} onPress={() => setter(current === value ? "" : value)}>{value}</Chip>)}</ScrollView>;
  return <View style={ui.safe}><View style={ui.screen}>
    <AppScreenScroll keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading && revision > 0} onRefresh={() => setRevision(v => v + 1)} tintColor={GREEN} />} header={<AppHeader title="KhelGujarat GIS Explore" subtitle="Discover sports infrastructure across Gujarat" onBack={onBack} />}>

      <View style={s.searchRow}><View style={s.search}><Ionicons name="search-outline" size={21} color={GREEN} /><TextInput accessibilityLabel="Search facilities, districts or sports" style={s.searchInput} placeholder="Search complex, district, sport..." value={q} onChangeText={setQ} autoCorrect={false} />{!!q && <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQ("")} style={ui.iconButton}><Ionicons name="close-circle" size={18} color="#789283" /></TouchableOpacity>}</View><TouchableOpacity accessibilityRole="button" accessibilityLabel={map ? "Show list" : "Show map"} onPress={() => setMap(v => !v)} style={s.mapButton}><Ionicons name={map ? "list-outline" : "map-outline"} size={22} color="white" /></TouchableOpacity></View>
      {options(meta.districts, district, setDistrict, "All districts")}
      {options(meta.sports, sport, setSport, "All disciplines")}
      <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : visible.length}</Text><Text style={ui.muted}>Facilities</Text></View><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : new Set(visible.map(f => f.district)).size}</Text><Text style={ui.muted}>Districts</Text></View><View style={s.stat}><Text style={s.statValue}>{loading ? "-" : new Set(visible.flatMap(f => f.sports.map(sp => sp.name))).size}</Text><Text style={ui.muted}>Sports</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => setPanel("filters")} style={s.filterButton}><Ionicons name="options-outline" size={19} color={GREEN} /><Text style={s.filterText}>Filters{activeCount ? ` (${activeCount})` : ""}</Text></TouchableOpacity></View>
      <View style={s.resultsHeading}><Text style={[ui.sectionTitle, {
            flex: 1
          }]}>Sports facilities</Text><TouchableOpacity accessibilityRole="button" onPress={() => setPanel("sort")} style={ui.row}><Text style={s.sortText}>{sort === "condition" ? "Best condition" : sort === "price" ? "Lowest price" : "Name A-Z"}</Text><Ionicons name="chevron-down" size={15} color={GREEN} /></TouchableOpacity></View>
      {loading ? <View style={ui.state}><ActivityIndicator size="large" color={GREEN} /><Text style={ui.muted}>Loading facilities...</Text></View> : error ? <StateMessage title="Could not load facilities" message={error} action="Try again" onAction={() => setRevision(v => v + 1)} /> : !visible.length ? <StateMessage title="No matching facilities" message="Try another district, sport or search term." action="Clear filters" onAction={reset} /> : <View style={s.results}>
        {map && <><FacilityMap facilities={visible} onSelect={select} /><Text style={ui.muted}>Tap a marker, then its name to view a facility. Only facilities with recorded coordinates appear on the map.</Text></>}
        {!map && visible.map(f => <View key={f.id} style={s.facilityCard}>
          <View style={s.photo}>{imageUrl(f.picture) ? <Image source={{
                uri: imageUrl(f.picture)
              }} style={s.photoImage} /> : <Ionicons name="business-outline" size={45} color="#7CA48C" />}<TouchableOpacity accessibilityRole="button" accessibilityLabel={favorites.includes(String(f.id)) ? "Remove saved facility" : "Save facility"} onPress={() => toggleFavorite(String(f.id))} style={s.heart}><Ionicons name={favorites.includes(String(f.id)) ? "heart" : "heart-outline"} size={22} color="white" /></TouchableOpacity><View style={s.photoCount}><Ionicons name="images-outline" size={13} color="white" /><Text style={s.photoCountText}>{new Set([f.picture, ...(f.gallery || [])].filter(Boolean)).size} photos</Text></View></View>
          <View style={s.cardBody}><Text style={s.facilityName}>{f.name}</Text><View style={[ui.row, {
                marginTop: 6
              }]}><Ionicons name="location-outline" size={14} color={GREEN} /><Text style={ui.muted}>{[f.district, f.taluka].filter(Boolean).join(", ")}</Text></View><View style={[ui.row, {
                justifyContent: "space-between",
                marginVertical: 12
              }]}><View style={ui.badge}><Text style={ui.badgeText}>{f.condition?.grade || "Not assessed"}</Text></View><Text style={s.fci}>FCI {f.condition?.score ?? "-"}/100</Text></View><View style={ui.wrap}>{AMENITIES.filter(a => f.amenities?.[a.key]).slice(0, 3).map(a => <View key={a.key} style={s.amenity}><Ionicons name={a.icon} size={14} color="#637A6D" /><Text style={s.amenityText}>{a.label}</Text></View>)}</View><View style={s.cardBottom}><View style={[ui.row, {
                  flex: 1
                }]}><Ionicons name="time-outline" size={15} color={GREEN} /><Text style={[ui.muted, {
                    flex: 1
                  }]}>{timingLabel(f)}</Text></View><Button onPress={() => select(f)}>View & book →</Button></View></View>
        </View>)}
      </View>}
    </AppScreenScroll>
    <Modal visible={!!panel} transparent animationType="slide" onRequestClose={() => setPanel(null)}><View style={s.backdrop}><View style={s.sheet}><View style={s.sheetHeading}><Text style={ui.sectionTitle}>{panel === "sort" ? "Sort facilities" : "Refine your search"}</Text><TouchableOpacity accessibilityLabel="Close filters" onPress={() => setPanel(null)} style={ui.iconButton}><Ionicons name="close" size={23} color={GREEN} /></TouchableOpacity></View><ScrollView contentContainerStyle={{
              gap: 16,
              paddingBottom: 16
            }}>
      {panel === "sort" ? [["name", "Name A-Z"], ["condition", "Best condition"], ["price", "Lowest starting price"]].map(([value, label]) => <Chip key={value} active={sort === value} onPress={() => {
                setSort(value);
                setPanel(null);
              }}>{label}</Chip>) : <><Text style={ui.label}>District</Text><View style={ui.wrap}><Chip active={!district} onPress={() => setDistrict("")}>All districts</Chip>{meta.districts.map(value => <Chip key={value} active={district === value} onPress={() => setDistrict(district === value ? "" : value)}>{value}</Chip>)}</View><Text style={ui.label}>Discipline</Text><View style={ui.wrap}><Chip active={!sport} onPress={() => setSport("")}>All sports</Chip>{meta.sports.map(value => <Chip key={value} active={sport === value} onPress={() => setSport(sport === value ? "" : value)}>{value}</Chip>)}</View><Text style={ui.label}>Condition grade</Text><View style={ui.wrap}>{["", "a", "b", "c", "d"].map(value => <Chip key={value} active={grade === value} onPress={() => setGrade(value)}>{value ? `Grade ${value.toUpperCase()}` : "Any grade"}</Chip>)}</View><Text style={ui.label}>Required amenities</Text><View style={ui.wrap}>{AMENITIES.map(a => <Chip key={a.key} active={amenities.includes(a.key)} onPress={() => setAmenities(previous => previous.includes(a.key) ? previous.filter(v => v !== a.key) : [...previous, a.key])}>{a.label}</Chip>)}</View><Chip active={savedOnly} onPress={() => setSavedOnly(v => !v)}>Saved facilities only</Chip><Button secondary onPress={reset}>Reset all filters</Button></>}
    </ScrollView><Button onPress={() => setPanel(null)}>Show results</Button></View></View></Modal>
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
