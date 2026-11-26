import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, ActivityIndicator, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../../components/AppText";
import FacilityMap from "../../components/FacilityMap";
import { Chip, Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import { loadFacilities, imageUrl, timingLabel, AMENITIES } from "../../services/facilityService";
import ComplexDetailScreen from "./ComplexDetailScreen";
import CitizenRatingModal from "../../components/citizen/CitizenRatingModal";

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GujaratExploreMapScreen({
  onSelectFacility,
  onBack,
  canRate = false,
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
  const [sort, setSort] = useState("name"); // "name" | "nearest" | "condition" | "rating" | "price"
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ districts: [], sports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [viewMode, setViewMode] = useState("list"); // "map" | "list"
  const [panel, setPanel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [ratingFacility, setRatingFacility] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem("facilityFavorites")
      .then((value) => {
        if (alive && value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) setFavorites(parsed);
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setFavoritesReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (favoritesReady) {
      AsyncStorage.setItem("facilityFavorites", JSON.stringify(favorites)).catch(() => {});
    }
  }, [favorites, favoritesReady]);

  const toggleFavorite = (id) =>
    setFavorites((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () =>
        loadFacilities({
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
          sort: sort === "nearest" ? "name" : sort,
        })
          .then((result) => {
            if (alive) {
              setRows(result.data || []);
              setMeta(result.meta || { districts: [], sports: [] });
            }
          })
          .catch((err) => {
            if (alive) {
              setError(err.message);
              setRows([]);
            }
          })
          .finally(() => {
            if (alive) setLoading(false);
          }),
      220
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, district, sport, grade, purpose, audience, maxPrice, hasSubscription, minRating, amenities, sort, revision]);

  const requestNearby = async () => {
    setLocationError("");
    if (userLocation && sort === "nearest") {
      setSort("name");
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Enable GPS access to sort by nearest facilities.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setSort("nearest");
    } catch (err) {
      setLocationError(err?.message || "Could not determine your current location.");
    } finally {
      setLocating(false);
    }
  };

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

  const visible = useMemo(() => {
    const base = savedOnly ? rows.filter((f) => favorites.includes(String(f.id))) : rows;
    const withDist = base.map((f) => {
      if (
        userLocation &&
        Number.isFinite(Number(f.latitude)) &&
        Number.isFinite(Number(f.longitude))
      ) {
        return {
          ...f,
          distanceKm: haversineKm(
            userLocation.latitude,
            userLocation.longitude,
            Number(f.latitude),
            Number(f.longitude)
          ),
        };
      }
      return f;
    });
    if (sort === "nearest" && userLocation) {
      return [...withDist].sort(
        (a, b) =>
          (typeof a.distanceKm === "number" ? a.distanceKm : Infinity) -
          (typeof b.distanceKm === "number" ? b.distanceKm : Infinity)
      );
    }
    return withDist;
  }, [rows, savedOnly, favorites, userLocation, sort]);

  // Only show districts and sports that actually have matching configured facilities
  const availableDistricts = useMemo(() => {
    if (district) return meta.districts || [];
    return [...new Set(rows.map((f) => f.district).filter(Boolean))].sort();
  }, [rows, meta.districts, district]);

  const availableSports = useMemo(() => {
    if (sport) return meta.sports || [];
    return [...new Set(rows.flatMap((f) => (f.sports || []).map((sp) => sp.name)).filter(Boolean))].sort();
  }, [rows, meta.sports, sport]);

  const select = (facility) => (onSelectFacility ? onSelectFacility(facility) : setPreview(facility));
  const activeCount =
    Number(!!district) +
    Number(!!sport) +
    Number(!!grade) +
    Number(!!purpose) +
    Number(!!audience) +
    Number(!!maxPrice) +
    Number(hasSubscription) +
    Number(minRating) +
    amenities.length +
    Number(savedOnly);

  if (preview) return <ComplexDetailScreen facility={preview} canRate={canRate} onBack={() => setPreview(null)} />;

  const renderFilterChips = (values, current, setter, allLabel) => {
    if (!values || values.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip active={!current} onPress={() => setter("")}>
          {allLabel}
        </Chip>
        {values.map((value) => (
          <Chip key={value} active={current === value} onPress={() => setter(current === value ? "" : value)}>
            {value}
          </Chip>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={ui.safe}>
      <View style={ui.screen}>
        <AppScreenScroll
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading && revision > 0}
              onRefresh={() => setRevision((v) => v + 1)}
              tintColor={GREEN}
            />
          }
          header={
            <AppHeader
              title="KhelGujarat GIS Explore"
              subtitle="Discover sports infrastructure across Gujarat"
              onBack={onBack}
            />
          }
        >
          <View style={s.searchRow}>
            <View style={s.search}>
              <Ionicons name="search-outline" size={21} color={GREEN} />
              <TextInput
                accessibilityLabel="Search facilities, districts or sports"
                style={s.searchInput}
                placeholder="Search complex, district, sport..."
                value={q}
                onChangeText={setQ}
                autoCorrect={false}
              />
              {!!q && (
                <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQ("")} style={ui.iconButton}>
                  <Ionicons name="close-circle" size={18} color="#789283" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* View Mode (List / Map) + Nearby Toggle */}
          <View style={s.viewToggleRow}>
            {[
              { id: "list", label: "List", icon: "list-outline" },
              { id: "map", label: "Map", icon: "map-outline" },
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
            <TouchableOpacity
              onPress={requestNearby}
              disabled={locating}
              style={[
                s.viewToggleBtn,
                sort === "nearest" && userLocation && s.viewToggleBtnActive,
              ]}
            >
              {locating ? (
                <ActivityIndicator size="small" color={GREEN} />
              ) : (
                <Ionicons
                  name="locate-outline"
                  size={15}
                  color={sort === "nearest" && userLocation ? "#ffffff" : GREEN}
                />
              )}
              <Text
                style={[
                  s.viewToggleText,
                  sort === "nearest" && userLocation && s.viewToggleTextActive,
                ]}
              >
                {locating ? "Locating..." : "Nearby"}
              </Text>
            </TouchableOpacity>
          </View>

          {!!locationError && (
            <Text style={s.locationWarning}>{locationError}</Text>
          )}

          {renderFilterChips(availableDistricts, district, setDistrict, "All districts")}
          {renderFilterChips(availableSports, sport, setSport, "All sports")}

          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statValue}>{loading ? "-" : visible.length}</Text>
              <Text style={ui.muted}>Facilities</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>{loading ? "-" : new Set(visible.map((f) => f.district)).size}</Text>
              <Text style={ui.muted}>Districts</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>
                {loading ? "-" : new Set(visible.flatMap((f) => f.sports.map((sp) => sp.name))).size}
              </Text>
              <Text style={ui.muted}>Sports</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => setPanel("filters")} style={s.filterButton}>
              <Ionicons name="options-outline" size={19} color={GREEN} />
              <Text style={s.filterText}>Filters{activeCount ? ` (${activeCount})` : ""}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.resultsHeading}>
            <Text style={[ui.sectionTitle, { flex: 1 }]}>Sports facilities</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setPanel("sort")} style={ui.row}>
              <Text style={s.sortText}>
                {sort === "nearest"
                  ? "Nearest first"
                  : sort === "condition"
                    ? "Best condition"
                    : sort === "rating"
                      ? "Top rated"
                      : sort === "price"
                        ? "Lowest price"
                        : "Name A-Z"}
              </Text>
              <Ionicons name="chevron-down" size={15} color={GREEN} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={ui.state}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={ui.muted}>Loading facilities...</Text>
            </View>
          ) : error ? (
            <StateMessage
              title="Could not load facilities"
              message={error}
              action="Try again"
              onAction={() => setRevision((v) => v + 1)}
            />
          ) : !visible.length ? (
            <StateMessage
              title="No matching facilities"
              message="Try another district, sport or search term."
              action="Clear filters"
              onAction={reset}
            />
          ) : (
            <View style={s.results}>
              {viewMode === "map" && (
                <>
                  <FacilityMap
                    facilities={visible}
                    onSelect={select}
                    userLocation={userLocation}
                    onRequestNearby={requestNearby}
                  />
                  <Text style={ui.muted}>
                    Use + / − controls or pinch to zoom. Tap any marker, then tap its popup to view &amp; book.
                  </Text>
                </>
              )}
              {viewMode === "list" &&
                visible.map((f) => (
                  <View key={f.id} style={s.facilityCard}>
                    <View style={s.photo}>
                      {imageUrl(f.picture) ? (
                        <Image source={{ uri: imageUrl(f.picture) }} style={s.photoImage} />
                      ) : (
                        <Ionicons name="business-outline" size={45} color="#7CA48C" />
                      )}
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={favorites.includes(String(f.id)) ? "Remove saved facility" : "Save facility"}
                        onPress={() => toggleFavorite(String(f.id))}
                        style={s.heart}
                      >
                        <Ionicons
                          name={favorites.includes(String(f.id)) ? "heart" : "heart-outline"}
                          size={22}
                          color="white"
                        />
                      </TouchableOpacity>
                      <View style={s.photoCount}>
                        <Ionicons name="images-outline" size={13} color="white" />
                        <Text style={s.photoCountText}>
                          {
                            new Set(
                              [
                                f.picture,
                                ...(f.gallery || []),
                                ...(f.sports || []).flatMap((sp) => sp.images || []),
                                ...(f.conditionPhotos || []).map((cp) => cp.url),
                              ].filter(Boolean)
                            ).size
                          }{" "}
                          photos
                        </Text>
                      </View>
                    </View>
                    <View style={s.cardBody}>
                      <Text style={s.facilityName}>{f.name}</Text>
                      <View style={[ui.row, { marginTop: 6, flexWrap: "wrap" }]}>
                        <Ionicons name="location-outline" size={14} color={GREEN} />
                        <Text style={ui.muted}>
                          {[f.district, f.taluka].filter(Boolean).join(", ")}
                        </Text>
                        {typeof f.distanceKm === "number" && (
                          <View style={s.distancePill}>
                            <Text style={s.distanceText}>{f.distanceKm.toFixed(1)} km away</Text>
                          </View>
                        )}
                      </View>
                      <View style={[ui.row, { justifyContent: "space-between", marginVertical: 12 }]}>
                        <View style={ui.badge}>
                          <Text style={ui.badgeText}>{f.condition?.grade || "Not assessed"}</Text>
                        </View>
                        <Text style={s.fci}>FCI {f.condition?.score ?? "-"}/100</Text>
                      </View>
                      <View style={ui.wrap}>
                        {AMENITIES.filter((a) => f.amenities?.[a.key])
                          .slice(0, 3)
                          .map((a) => (
                            <View key={a.key} style={s.amenity}>
                              <Ionicons name={a.icon} size={14} color="#637A6D" />
                              <Text style={s.amenityText}>{a.label}</Text>
                            </View>
                          ))}
                      </View>
                      <View style={s.cardBottom}>
                        <View style={[ui.row, { flex: 1 }]}>
                          <Ionicons name="time-outline" size={15} color={GREEN} />
                          <Text style={[ui.muted, { flex: 1 }]}>{timingLabel(f)}</Text>
                        </View>
                        {canRate ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Rate ${f.name}`}
                            onPress={() => setRatingFacility(f)}
                            style={s.rateButton}
                          >
                            <Ionicons name="star-outline" size={18} color="#B45309" />
                            <Text style={s.rateButtonText}>Rate</Text>
                          </TouchableOpacity>
                        ) : null}
                        <Button onPress={() => select(f)}>View &amp; book →</Button>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </AppScreenScroll>

        <Modal visible={!!panel} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <View style={s.sheetHeading}>
                <Text style={ui.sectionTitle}>{panel === "sort" ? "Sort facilities" : "Advance filters"}</Text>
                <TouchableOpacity accessibilityLabel="Close filters" onPress={() => setPanel(null)} style={ui.iconButton}>
                  <Ionicons name="close" size={23} color={GREEN} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
                {panel === "sort" ? (
                  [
                    ["name", "Name A-Z"],
                    ["nearest", "Nearest to me (GPS)"],
                    ["condition", "Best condition"],
                    ["rating", "Top rated"],
                    ["price", "Lowest starting price"],
                  ].map(([value, label]) => (
                    <Chip
                      key={value}
                      active={sort === value}
                      onPress={() => {
                        setPanel(null);
                        if (value === "nearest") requestNearby();
                        else setSort(value);
                      }}
                    >
                      {label}
                    </Chip>
                  ))
                ) : (
                  <>
                    <Text style={ui.label}>Session purpose</Text>
                    <View style={ui.wrap}>
                      {[
                        ["", "Any"],
                        ["coaching", "Coaching"],
                        ["open-play", "Open play"],
                        ["competition", "Competition"],
                      ].map(([value, label]) => (
                        <Chip key={label} active={purpose === value} onPress={() => setPurpose(value)}>
                          {label}
                        </Chip>
                      ))}
                    </View>
                    <Text style={ui.label}>Batch / audience</Text>
                    <View style={ui.wrap}>
                      {[
                        ["", "Any"],
                        ["mixed", "Mixed"],
                        ["women", "Women only"],
                        ["children", "Children"],
                        ["members", "Members"],
                      ].map(([value, label]) => (
                        <Chip key={label} active={audience === value} onPress={() => setAudience(value)}>
                          {label}
                        </Chip>
                      ))}
                    </View>
                    <Text style={ui.label}>Slot budget</Text>
                    <View style={ui.wrap}>
                      {[
                        ["", "Any"],
                        ["150", "Up to ₹150"],
                        ["300", "Up to ₹300"],
                        ["500", "Up to ₹500"],
                      ].map(([value, label]) => (
                        <Chip key={label} active={maxPrice === value} onPress={() => setMaxPrice(value)}>
                          {label}
                        </Chip>
                      ))}
                    </View>
                    <Text style={ui.label}>Plans &amp; quality</Text>
                    <View style={ui.wrap}>
                      <Chip active={hasSubscription} onPress={() => setHasSubscription((v) => !v)}>
                        Monthly / Yearly plans
                      </Chip>
                      <Chip active={minRating} onPress={() => setMinRating((v) => !v)}>
                        4.0★ &amp; above
                      </Chip>
                      <Chip active={grade === "a"} onPress={() => setGrade(grade === "a" ? "" : "a")}>
                        Grade A condition
                      </Chip>
                    </View>
                    <Text style={ui.label}>Required amenities</Text>
                    <View style={ui.wrap}>
                      {AMENITIES.map((a) => (
                        <Chip
                          key={a.key}
                          active={amenities.includes(a.key)}
                          onPress={() =>
                            setAmenities((previous) =>
                              previous.includes(a.key)
                                ? previous.filter((v) => v !== a.key)
                                : [...previous, a.key]
                            )
                          }
                        >
                          {a.label}
                        </Chip>
                      ))}
                    </View>
                    <Chip active={savedOnly} onPress={() => setSavedOnly((v) => !v)}>
                      Saved facilities only
                    </Chip>
                    <Button secondary onPress={reset}>
                      Reset all filters
                    </Button>
                  </>
                )}
              </ScrollView>
              <Button onPress={() => setPanel(null)}>Show results</Button>
            </View>
          </View>
        </Modal>

        <CitizenRatingModal
          visible={!!ratingFacility}
          facility={ratingFacility}
          onClose={() => setRatingFacility(null)}
          onSaved={() => setRevision((value) => value + 1)}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    gap: 9,
    margin: 16,
    marginTop: 15,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E0E9E3",
    borderRadius: 15,
    paddingLeft: 13,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 13,
    fontSize: 12,
    color: "#254B34",
  },
  viewToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
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
    backgroundColor: "white",
  },
  viewToggleBtnActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },
  viewToggleTextActive: {
    color: "white",
  },
  locationWarning: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 11.5,
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    borderRadius: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#173C28",
    fontSize: 20,
    fontWeight: "800",
  },
  filterButton: {
    backgroundColor: "#E0F6E6",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 3,
  },
  filterText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700",
  },
  resultsHeading: {
    marginHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: GREEN,
  },
  results: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  facilityCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1EAE4",
    overflow: "hidden",
    backgroundColor: "white",
  },
  photo: {
    height: 170,
    backgroundColor: "#E0EDE4",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
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
    justifyContent: "center",
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
    backgroundColor: "rgba(10,40,24,0.6)",
  },
  photoCountText: {
    color: "white",
    fontSize: 10,
  },
  cardBody: {
    padding: 15,
  },
  facilityName: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    color: "#173C28",
    letterSpacing: -0.4,
  },
  distancePill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  distanceText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0369A1",
  },
  fci: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B6356",
  },
  amenity: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: "#F4F7F5",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 10,
    color: "#637A6D",
  },
  cardBottom: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#FFF7E6",
  },
  rateButtonText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,25,14,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#F8FBF9",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 12,
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
