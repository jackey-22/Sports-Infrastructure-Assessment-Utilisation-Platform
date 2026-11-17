import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../theme/colors";
import CitizenHeader from "../../components/common/CitizenHeader";
import { citizenService } from "../../services/citizen/citizenService";

const CATEGORIES = [
  { id: "cat_1", label: "Turf & Surface Degradation", iconName: "grass", iconType: "material" },
  { id: "cat_2", label: "Floodlight & Electrical Outage", iconName: "flash", iconType: "ion" },
  { id: "cat_3", label: "Sanitation & Drinking Water", iconName: "water", iconType: "ion" },
  { id: "cat_4", label: "Locker Room & Hygiene", iconName: "locker", iconType: "material" },
  { id: "cat_5", label: "Equipment Replacement Needed", iconName: "dumbbell", iconType: "material" },
  { id: "cat_6", label: "Perimeter & Security Issue", iconName: "shield-checkmark", iconType: "ion" },
];

const INITIAL_COMPLAINTS = [
  {
    id: "comp_101",
    category: "Turf & Surface Degradation",
    categoryIcon: "grass",
    subject: "Court 2 Badminton Net Cable Slack",
    description: "The tension cable on court 2 is sagging, causing uneven height during matches.",
    facility: "SAG Khokhra Sports Complex",
    date: "24 Oct 2026",
    status: "Action Taken",
    statusType: "action_taken",
    images: [
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=300&q=80",
    ],
    extraCount: 1,
  },
  {
    id: "comp_102",
    category: "Floodlight & Electrical Outage",
    categoryIcon: "flash",
    subject: "Northeast Floodlight Tower 3 Halogen Off",
    description: "Two bulbs on the corner mast are non-functional causing shadows on the track.",
    facility: "SAG Khokhra Sports Complex",
    date: "18 Oct 2026",
    status: "Resolved",
    statusType: "resolved",
    images: [
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=300&q=80",
    ],
    extraCount: 0,
  },
];

export const ComplaintsScreen = ({ onBack, onLogout }) => {
  const [complaints, setComplaints] = useState([]);
  const [complaintTypes, setComplaintTypes] = useState(CATEGORIES.map((item) => ({
    id: item.id,
    name: item.label,
  })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].label);
  const [subject, setSubject] = useState("Court 2 Badminton Net Cable Slack");
  const [description, setDescription] = useState("");
  const [facility, setFacility] = useState("SAG Khokhra Sports Complex");
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const mapComplaintForView = (item) => ({
    ...item,
    categoryIcon: item.category && item.category.toLowerCase().includes("floodlight") ? "flash" : "grass",
    subject: item.subject || item.category || "Infrastructure grievance",
    facility: item.facilityName || "Sports Complex",
    date: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Recently",
    statusType: item.status === "Resolved" ? "resolved" : "action_taken",
    images: item.photo ? (Array.isArray(item.photo) ? item.photo : [item.photo]) : [],
    extraCount: 0,
  });

  const loadComplaints = async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, types] = await Promise.all([
        citizenService.listComplaints(),
        citizenService.listComplaintTypes(),
      ]);
      setComplaints(rows.map(mapComplaintForView));
      if (types.length) {
        setComplaintTypes(types);
        setSelectedCategory((current) =>
          types.some((type) => type.name === current) ? current : types[0].name
        );
      }
    } catch (requestError) {
      setError(requestError.message || "Could not load grievances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Gallery permission is needed to attach evidence.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is needed to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Required", "Please provide a summary / subject.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please describe the issue before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedType = complaintTypes.find((type) => type.name === selectedCategory);
      const photoUri = photos[0];
      const photoFile = photoUri
        ? {
            uri: photoUri,
            name: `grievance-${Date.now()}.jpg`,
            type: "image/jpeg",
          }
        : null;
      await citizenService.submitComplaint({
        typeId: selectedType?.id || selectedCategory,
        description,
        photoFile,
      });
      setIsModalOpen(false);
      setDescription("");
      setPhotos([]);
      await loadComplaints();
      Alert.alert("Grievance Submitted", "Ticket has been dispatched to ground manager and supervisor.");
    } catch (submitError) {
      Alert.alert("Could not submit grievance", submitError.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. TOP CURVED HEADER — unified CitizenHeader */}
        <CitizenHeader
          title="Grievance Redressal"
          subtitle="Sports Infrastructure Maintenance Portal"
          watermarkIcon="stadium"
        />

        {/* 2. REPORT HERO CARD */}
        <View style={styles.reportHeroCard}>
          <View style={styles.reportHeroContentRow}>
            <View style={styles.reportHeroLeft}>
              <Text style={styles.reportHeroTitle}>Report Damaged Infrastructure</Text>
              <Text style={styles.reportHeroDesc}>
                Notice a torn turf, blown floodlight, or broken sanitation? Submit a geo-tagged issue with photo evidence.
              </Text>
            </View>

            {/* Illustration / Graphic Icon */}
            <View style={styles.clipboardGraphic}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#007D40" />
              <View style={styles.warningBadge}>
                <Ionicons name="warning" size={14} color="#ea580c" />
              </View>
            </View>
          </View>

          {/* Raise Complaint CTA Button */}
          <TouchableOpacity
            style={styles.raiseComplaintBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.raiseComplaintBtnText}>Raise New Complaint</Text>
          </TouchableOpacity>
        </View>

        {/* 3. YOUR GRIEVANCES TITLE ROW */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Grievances ({complaints.length})</Text>

          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Ionicons name="funnel-outline" size={13} color="#007D40" style={{ marginRight: 4 }} />
            <Text style={styles.filterBtnText}>All</Text>
            <Ionicons name="chevron-down" size={13} color="#475569" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* 4. GRIEVANCES LIST CARDS */}
        <View style={styles.grievanceList}>
          {loading ? <Text style={styles.stateText}>Loading your grievances…</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!loading && !error && complaints.length === 0 ? (
            <Text style={styles.stateText}>No grievances submitted yet.</Text>
          ) : null}
          {complaints.map((item) => (
            <View key={item.id} style={styles.grievanceCard}>
              {/* Category & Status Row */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.categoryPill}>
                  {item.categoryIcon === "flash" ? (
                    <Ionicons name="flash" size={13} color="#ea580c" style={{ marginRight: 4 }} />
                  ) : (
                    <MaterialCommunityIcons name="grass" size={15} color="#007D40" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.categoryPillText} numberOfLines={1}>{item.category}</Text>
                </View>

                {item.statusType === "resolved" ? (
                  <View style={styles.resolvedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#15803d" style={{ marginRight: 4 }} />
                    <Text style={styles.resolvedPillText}>Resolved</Text>
                  </View>
                ) : (
                  <View style={styles.actionTakenPill}>
                    <Text style={styles.actionTakenPillText}>Action Taken</Text>
                  </View>
                )}
              </View>

              {/* Subject Title */}
              <Text style={styles.subjectTitle} numberOfLines={2}>
                {item.subject}
              </Text>

              {/* Description */}
              <Text style={styles.descText} numberOfLines={2}>
                {item.description}
              </Text>

              {/* Photos Row */}
              {item.images && item.images.length > 0 && (
                <View style={styles.thumbnailRow}>
                  {item.images.slice(0, 2).map((imgUri, idx) => (
                    <Image key={idx} source={{ uri: imgUri }} style={styles.thumbnailImg} resizeMode="cover" />
                  ))}
                  {item.extraCount > 0 && (
                    <View style={styles.extraImgBox}>
                      <Text style={styles.extraImgText}>+{item.extraCount}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Footer Meta Row */}
              <View style={styles.cardFooterRow}>
                <View style={styles.footerLeft}>
                  <Ionicons name="location-sharp" size={13} color="#007D40" style={{ marginRight: 4 }} />
                  <Text style={styles.facilityText} numberOfLines={1}>{item.facility}</Text>
                  <Ionicons name="calendar-outline" size={13} color="#64748b" style={{ marginLeft: 8, marginRight: 4 }} />
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>

                <TouchableOpacity style={styles.arrowCircleBtn} activeOpacity={0.7}>
                  <Ionicons name="arrow-forward" size={14} color="#007D40" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* 5. AVERAGE RESOLUTION TIME BANNER */}
        <View style={styles.resolutionBanner}>
          <View style={styles.resolutionLeft}>
            <View style={styles.resolutionIconBox}>
              <Ionicons name="bar-chart" size={16} color="#007D40" />
            </View>
            <Text style={styles.resolutionLabel}>Average Resolution Time</Text>
          </View>
          <Text style={styles.resolutionValue}>3.2 Days</Text>
        </View>
      </ScrollView>

      {/* 6. RIGHT SCREEN: FILE MAINTENANCE GRIEVANCE MODAL */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>File Maintenance Grievance</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            {/* Category Section */}
            <Text style={styles.formSectionLabel}>
              Issue Category <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>

            <View style={styles.categoryRadioList}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryRadioCard, isSelected && styles.categoryRadioCardSelected]}
                    onPress={() => setSelectedCategory(cat.label)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.categoryRadioLeft}>
                      {cat.iconName === "grass" ? (
                        <MaterialCommunityIcons name="grass" size={18} color="#007D40" style={{ marginRight: 8 }} />
                      ) : cat.iconName === "locker" ? (
                        <MaterialCommunityIcons name="locker" size={18} color="#007D40" style={{ marginRight: 8 }} />
                      ) : cat.iconName === "dumbbell" ? (
                        <MaterialCommunityIcons name="dumbbell" size={18} color="#007D40" style={{ marginRight: 8 }} />
                      ) : (
                        <Ionicons name={cat.iconName} size={18} color="#007D40" style={{ marginRight: 8 }} />
                      )}
                      <Text style={[styles.categoryRadioText, isSelected && styles.categoryRadioTextSelected]}>
                        {cat.label}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color="#007D40" />
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary / Subject */}
            <Text style={styles.formSectionLabel}>
              Summary / Subject <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Court 2 Badminton Net Cable Slack"
              placeholderTextColor="#94a3b8"
            />

            {/* Detailed Description */}
            <Text style={styles.formSectionLabel}>
              Detailed Description <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.textareaWrapper}>
              <TextInput
                style={styles.textareaInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the exact location, safety hazards, and impact on play..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCounter}>{description.length} / 500</Text>
            </View>

            {/* Location / Facility */}
            <Text style={styles.formSectionLabel}>
              Location / Facility <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.facilityPickerBox}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                <Ionicons name="location-sharp" size={16} color="#007D40" style={{ marginRight: 6 }} />
                <Text style={styles.facilityPickerText} numberOfLines={1}>{facility}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </View>

            {/* Photo Evidence (Optional) */}
            <Text style={styles.formSectionLabel}>Photo Evidence (Optional)</Text>

            <View style={styles.photoUploadBox}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={36} color="#007D40" />
              <Text style={styles.addPhotosText}>Add Photos</Text>
              <Text style={styles.addPhotosSub}>Take a photo or choose from gallery</Text>
              <Text style={styles.addPhotosFormats}>JPEG, PNG (Max 5 MB each)</Text>

              {photos.length > 0 && (
                <View style={styles.previewThumbsRow}>
                  {photos.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.modalThumb} />
                  ))}
                </View>
              )}
            </View>

            {/* Photo Action Buttons */}
            <View style={styles.photoActionButtonsRow}>
              <TouchableOpacity style={styles.photoActionButton} onPress={handleTakePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={18} color="#007D40" style={{ marginRight: 6 }} />
                <Text style={styles.photoActionBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoActionButton} onPress={handlePickPhoto} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={18} color="#007D40" style={{ marginRight: 6 }} />
                <Text style={styles.photoActionBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSubmitText}>Submit Grievance to SAG</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  runnerLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  govTextCol: {
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
  stadiumWatermark: {
    paddingBottom: 2,
    opacity: 0.85,
  },

  // 2. Report Hero Card
  reportHeroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reportHeroContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  reportHeroLeft: {
    flex: 1,
    marginRight: 10,
  },
  reportHeroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  reportHeroDesc: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
    marginTop: 3,
  },
  clipboardGraphic: {
    position: "relative",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  raiseComplaintBtn: {
    backgroundColor: "#007D40",
    borderRadius: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  raiseComplaintBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  // 3. Section Header Row
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },

  // 4. Grievances List
  grievanceList: {
    marginHorizontal: 16,
    gap: 12,
  },
  grievanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  actionTakenPill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  actionTakenPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284c7",
  },
  resolvedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  resolvedPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  descText: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginBottom: 10,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  thumbnailImg: {
    width: 68,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  extraImgBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  extraImgText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  facilityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    maxWidth: "50%",
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
  },
  arrowCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e8f5ee",
    alignItems: "center",
    justifyContent: "center",
  },

  // 5. Resolution Time Banner
  resolutionBanner: {
    backgroundColor: "#dcfce7",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resolutionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resolutionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  resolutionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  resolutionValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#007D40",
  },
  stateText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 24,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 18,
  },

  // 6. Modal Styles (Right Screen)
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalScrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    marginTop: 12,
  },
  categoryRadioList: {
    gap: 8,
    marginBottom: 8,
  },
  categoryRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryRadioCardSelected: {
    backgroundColor: "#f0fdf4",
    borderColor: "#007D40",
  },
  categoryRadioLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  categoryRadioText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  categoryRadioTextSelected: {
    color: "#007D40",
    fontWeight: "800",
  },
  unselectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
  },
  subjectInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 4,
  },
  textareaWrapper: {
    position: "relative",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    paddingBottom: 28,
  },
  textareaInput: {
    fontSize: 13,
    color: "#0f172a",
    height: 70,
    textAlignVertical: "top",
  },
  charCounter: {
    position: "absolute",
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: "#94a3b8",
  },
  facilityPickerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  facilityPickerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  photoUploadBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  addPhotosText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  addPhotosSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  addPhotosFormats: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  previewThumbsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  modalThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  photoActionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5ee",
    borderRadius: 12,
    paddingVertical: 12,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007D40",
  },
  modalSubmitButton: {
    backgroundColor: "#007D40",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ComplaintsScreen;
