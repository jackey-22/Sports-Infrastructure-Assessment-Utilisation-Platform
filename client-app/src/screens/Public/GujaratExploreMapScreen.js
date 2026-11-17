import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { GUJARAT_DISTRICTS, SPORTS_LIST } from "../../data/gujaratSportsData";
import { FciGauge } from "../../components/common/FciGauge";
import CitizenHeader from "../../components/common/CitizenHeader";

const { width } = Dimensions.get("window");

const EXPLORE_FACILITIES = [
  {
    id: "fac_khokhra_01",
    name: "SAG Khokhra Sports Complex",
    district: "Ahmedabad",
    taluka: "Maninagar",
    location: "Khokhra, Near Anupam Cinema, Ahmedabad, Gujarat 380008",
    grade: "Grade A • Excellent",
    gradeType: "grade_a",
    latitude: 23.0035,
    longitude: 72.6105,
    photosCount: "1 / 6",
    picture: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    timings: "06:00 AM - 09:00 PM",
    areaAcres: 14.5,
    amenities: [
      { id: "1", label: "Floodlights", icon: "flash-outline" },
      { id: "2", label: "Accessible", icon: "body-outline" },
      { id: "3", label: "Parking", icon: "car-outline" },
    ],
    moreCount: "+2 More",
    score: 92,
  },
  {
    id: "fac_naranpura_02",
    name: "SAG Naranpura Sports Complex",
    district: "Ahmedabad",
    taluka: "Naranpura",
    location: "Naranpura Cross Roads, Ahmedabad, Gujarat 380013",
    grade: "Grade B • Good",
    gradeType: "grade_b",
    latitude: 23.0525,
    longitude: 72.545,
    photosCount: "1 / 4",
    picture: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
    timings: "06:00 AM - 10:00 PM",
    areaAcres: 12.0,
    amenities: [
      { id: "1", label: "Basketball", icon: "basketball-outline" },
      { id: "2", label: "Indoor Hall", icon: "business-outline" },
      { id: "3", label: "Parking", icon: "car-outline" },
    ],
    moreCount: "+1 More",
    score: 84,
  },
  {
    id: "fac_surat_03",
    name: "SAG Athwa Lines Sports Complex",
    district: "Surat",
    taluka: "Athwa",
    location: "Athwa Lines, Near Indoor Stadium, Surat, Gujarat 395001",
    grade: "Grade A • Excellent",
    gradeType: "grade_a",
    latitude: 21.1702,
    longitude: 72.8015,
    photosCount: "1 / 5",
    picture: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    timings: "06:00 AM - 09:30 PM",
    areaAcres: 18.2,
    amenities: [
      { id: "1", label: "Olympic Track", icon: "speedometer-outline" },
      { id: "2", label: "Accessible", icon: "body-outline" },
      { id: "3", label: "Floodlights", icon: "flash-outline" },
    ],
    moreCount: "+3 More",
    score: 90,
  },
];

export const GujaratExploreMapScreen = ({ navigation, onSelectFacility, onBack }) => {
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedSport, setSelectedSport] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [favorites, setFavorites] = useState({});
  const [previewFacility, setPreviewFacility] = useState(null);

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFacilities = useMemo(() => {
    return EXPLORE_FACILITIES.filter((fac) => {
      const matchDistrict = selectedDistrict === "All" || fac.district === selectedDistrict;
      const matchSearch =
        fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fac.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fac.taluka.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDistrict && matchSearch;
    });
  }, [selectedDistrict, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. Shared Citizen/Athlete header */}
        <CitizenHeader
          title="Gujarat GIS Explore"
          subtitle="33 Districts Infrastructure Map"
          onBack={onBack}
          showBack={Boolean(onBack)}
          watermarkIcon="domain"
        />

        {/* 2. SEARCH BAR & VIEW MODE TOGGLE */}
        <View style={styles.searchToggleRow}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color="#475569" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search complex, district, sport..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List / Map View Toggles */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.listToggleBtn, viewMode === "list" && styles.toggleBtnActive]}
              onPress={() => setViewMode("list")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === "list" ? "#007D40" : "#475569"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mapToggleBtn, viewMode === "map" && styles.mapToggleActive]}
              onPress={() => setViewMode("map")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="map"
                size={15}
                color={viewMode === "map" ? "#ffffff" : "#475569"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.mapToggleText, viewMode === "map" && styles.mapToggleTextActive]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. DISTRICT FILTER PILLS (Row 1) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.districtPillsRow}
        >
          <TouchableOpacity
            style={[styles.pill, selectedDistrict === "All" && styles.pillActive]}
            onPress={() => setSelectedDistrict("All")}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, selectedDistrict === "All" && styles.pillTextActive]}>
              All 33 Districts (12)
            </Text>
          </TouchableOpacity>

          {GUJARAT_DISTRICTS.slice(0, 10).map((dist) => (
            <TouchableOpacity
              key={dist}
              style={[styles.pill, selectedDistrict === dist && styles.pillActive]}
              onPress={() => setSelectedDistrict(dist)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, selectedDistrict === dist && styles.pillTextActive]}>
                {dist}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 4. DISCIPLINES / SPORTS FILTER PILLS (Row 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportsPillsRow}
        >
          <TouchableOpacity
            style={[styles.sportPill, selectedSport === "All" && styles.sportPillActive]}
            onPress={() => setSelectedSport("All")}
            activeOpacity={0.7}
          >
            <Text style={[styles.sportPillText, selectedSport === "All" && styles.sportPillTextActive]}>
              All Disciplines
            </Text>
          </TouchableOpacity>

          {SPORTS_LIST.slice(0, 8).map((sp) => (
            <TouchableOpacity
              key={sp.id}
              style={[styles.sportPill, selectedSport === sp.name && styles.sportPillActive]}
              onPress={() => setSelectedSport(sp.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.sportIconEmoji}>{sp.icon}</Text>
              <Text style={[styles.sportPillText, selectedSport === sp.name && styles.sportPillTextActive]}>
                {sp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 5. 4-COLUMN STATS / FILTERS BAR */}
        <View style={styles.statsFilterCard}>
          {/* Facilities Found */}
          <View style={styles.statsCol}>
            <View style={styles.statsIconBox}>
              <MaterialCommunityIcons name="domain" size={16} color="#007D40" />
            </View>
            <Text style={styles.statsNum}>12</Text>
            <Text style={styles.statsLabel} numberOfLines={1}>Facilities Found</Text>
          </View>

          <View style={styles.statsDivider} />

          {/* Districts */}
          <View style={styles.statsCol}>
            <View style={styles.statsIconBox}>
              <Ionicons name="location-outline" size={16} color="#007D40" />
            </View>
            <Text style={styles.statsNum}>8</Text>
            <Text style={styles.statsLabel} numberOfLines={1}>Districts</Text>
          </View>

          <View style={styles.statsDivider} />

          {/* Sports */}
          <View style={styles.statsCol}>
            <View style={styles.statsIconBox}>
              <MaterialCommunityIcons name="run" size={16} color="#007D40" />
            </View>
            <Text style={styles.statsNum}>5</Text>
            <Text style={styles.statsLabel} numberOfLines={1}>Sports</Text>
          </View>

          {/* Filters Button */}
          <TouchableOpacity style={styles.filterActionBtn} activeOpacity={0.7}>
            <Ionicons name="filter-outline" size={16} color="#007D40" />
            <Text style={styles.filterActionText}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* 6. SECTION HEADER & SORT */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Sports Facilities in Gujarat</Text>

          <TouchableOpacity style={styles.sortBtn} activeOpacity={0.7}>
            <Text style={styles.sortBtnText}>Sort: <Text style={{ fontWeight: "700" }}>Relevance</Text></Text>
            <Ionicons name="chevron-down" size={13} color="#475569" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* 7. MAIN CONTENT: LIST OR MAP */}
        {viewMode === "map" ? (
          <View style={styles.mapVisualContainer}>
            <View style={styles.gisNoticeBar}>
              <Ionicons name="map-outline" size={15} color="#007D40" />
              <Text style={styles.gisNoticeText}>Interactive Gujarat GIS Geotagged Complexes</Text>
            </View>

            {filteredFacilities.map((fac) => (
              <TouchableOpacity
                key={fac.id}
                style={styles.gisPinItem}
                onPress={() => setPreviewFacility(fac)}
                activeOpacity={0.8}
              >
                <View style={styles.gisPinLeft}>
                  <View style={styles.pinDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinName} numberOfLines={1}>{fac.name}</Text>
                    <Text style={styles.pinSub} numberOfLines={1}>{fac.district} • {fac.taluka}</Text>
                  </View>
                </View>

                <View style={styles.gisPinRight}>
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillText}>FCI {fac.score}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.facilitiesList}>
            {filteredFacilities.map((fac) => {
              const isFav = !!favorites[fac.id];
              return (
                <View key={fac.id} style={styles.facilityCard}>
                  {/* Photo Container with Top Heart & Bottom Counter */}
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: fac.picture }} style={styles.facilityImg} resizeMode="cover" />

                    {/* Top Right Heart Button */}
                    <TouchableOpacity
                      style={styles.heartBtn}
                      onPress={() => toggleFavorite(fac.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isFav ? "heart" : "heart-outline"}
                        size={17}
                        color={isFav ? "#ef4444" : "#ffffff"}
                      />
                    </TouchableOpacity>

                    {/* Bottom Right Photo Counter Pill */}
                    <View style={styles.photoCounterPill}>
                      <Ionicons name="images-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.photoCounterText}>{fac.photosCount}</Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardBody}>
                    {/* Title & Grade Badge */}
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.facilityName} numberOfLines={1} ellipsizeMode="tail">
                        {fac.name}
                      </Text>
                      <View style={styles.gradeBadge}>
                        <Text style={styles.gradeBadgeText}>{fac.grade}</Text>
                      </View>
                    </View>

                    {/* Location */}
                    <View style={styles.locationRow}>
                      <Ionicons name="location-sharp" size={14} color="#007D40" style={{ marginRight: 4 }} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {fac.district}, {fac.taluka}
                      </Text>
                    </View>

                    {/* Amenities Chips */}
                    <View style={styles.amenitiesRow}>
                      {fac.amenities.map((am) => (
                        <View key={am.id} style={styles.amenityChip}>
                          <Ionicons name={am.icon} size={13} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={styles.amenityChipText}>{am.label}</Text>
                        </View>
                      ))}
                      {fac.moreCount && (
                        <View style={styles.moreChip}>
                          <Text style={styles.moreChipText}>{fac.moreCount}</Text>
                        </View>
                      )}
                    </View>

                    {/* Footer: Timings & View & Book Button */}
                    <View style={styles.cardFooterRow}>
                      <View style={styles.timingsRow}>
                        <Ionicons name="time-outline" size={14} color="#007D40" style={{ marginRight: 4 }} />
                        <Text style={styles.timingsText}>{fac.timings}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.viewBookBtn}
                        onPress={() => {
                          if (onSelectFacility) {
                            onSelectFacility(fac);
                          } else {
                            setPreviewFacility(fac);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.viewBookText}>View & Book Slot</Text>
                        <Ionicons name="arrow-forward" size={13} color="#ffffff" style={{ marginLeft: 3 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Facility Detail Preview Bottom Sheet */}
      {previewFacility && (
        <Modal
          visible={!!previewFacility}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPreviewFacility(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>{previewFacility.name}</Text>
                  <Text style={styles.sheetSubtitle}>
                    {previewFacility.district} District • {previewFacility.taluka}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPreviewFacility(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                <FciGauge score={previewFacility.score || 90} />
                <View style={styles.specsBox}>
                  <Text style={styles.specsTitle}>FACILITY SPECIFICATIONS</Text>
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Total Area:</Text>
                    <Text style={styles.specVal}>{previewFacility.areaAcres || "14.5"} Acres</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Timings:</Text>
                    <Text style={styles.specVal}>{previewFacility.timings}</Text>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Address:</Text>
                    <Text style={styles.specVal}>{previewFacility.location}</Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.sheetBookBtn}
                onPress={() => {
                  const target = previewFacility;
                  setPreviewFacility(null);
                  if (onSelectFacility) {
                    onSelectFacility(target);
                  }
                }}
              >
                <Text style={styles.sheetBookBtnText}>Proceed to Slot Booking & Passes</Text>
                <Ionicons name="ticket-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // 1. Header
  headerContainer: {
    backgroundColor: "#007D40",
    paddingTop: Platform.OS === "android" ? 12 : 6,
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  brandTextCol: {
    flex: 1,
  },
  govSubtitle: {
    color: "#d1fae5",
    fontSize: 9,
    fontWeight: "600",
  },
  govTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 2,
  },
  screenTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  heritageWatermark: {
    paddingBottom: 2,
    opacity: 0.85,
  },

  // 2. Search & Toggle Row
  searchToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: -16,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    borderColor: "#007D40",
  },
  mapToggleBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  mapToggleActive: {
    backgroundColor: "#007D40",
    borderColor: "#007D40",
  },
  mapToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  mapToggleTextActive: {
    color: "#ffffff",
  },

  // 3. District Pills
  districtPillsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillActive: {
    backgroundColor: "#007D40",
    borderColor: "#007D40",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  pillTextActive: {
    color: "#ffffff",
  },

  // 4. Sports Pills
  sportsPillsRow: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 8,
  },
  sportPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  sportPillActive: {
    backgroundColor: "#007D40",
    borderColor: "#007D40",
  },
  sportIconEmoji: {
    fontSize: 12,
  },
  sportPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  sportPillTextActive: {
    color: "#ffffff",
  },

  // 5. 4-Column Stats & Filters Card
  statsFilterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsCol: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  statsIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statsNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 1,
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#e2e8f0",
  },
  filterActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  filterActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#007D40",
  },

  // 6. Section Header & Sort
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortBtnText: {
    fontSize: 11,
    color: "#475569",
  },

  // 7. Facilities List Cards
  facilitiesList: {
    marginHorizontal: 16,
    gap: 14,
  },
  facilityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  photoContainer: {
    position: "relative",
    width: "100%",
    height: 160,
  },
  facilityImg: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCounterPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  photoCounterText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
    marginRight: 6,
  },
  gradeBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amenityChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  moreChip: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moreChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4f46e5",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  timingsRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  timingsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  viewBookBtn: {
    backgroundColor: "#007D40",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  viewBookText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },

  // Map Mode Container
  mapVisualContainer: {
    marginHorizontal: 16,
    gap: 8,
  },
  gisNoticeBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginBottom: 6,
  },
  gisNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#007D40",
  },
  gisPinItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gisPinLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007D40",
  },
  pinName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  pinSub: {
    fontSize: 11,
    color: "#64748b",
  },
  gisPinRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scorePill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scorePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },

  // Modal Bottom Sheet Preview
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  specsBox: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  specsTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  specKey: {
    fontSize: 11,
    color: "#64748b",
  },
  specVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: "60%",
    textAlign: "right",
  },
  sheetBookBtn: {
    backgroundColor: "#007D40",
    borderRadius: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  sheetBookBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default GujaratExploreMapScreen;
