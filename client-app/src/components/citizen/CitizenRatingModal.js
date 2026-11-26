import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../AppText";
import { citizenService } from "../../services/citizen/citizenService";
import { colors } from "../../theme/colors";

const TARGETS = [
  { value: "facility", label: "Facility" },
  { value: "sport", label: "Sport" },
  { value: "coach", label: "Coach" },
];

const ratingLabel = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function CitizenRatingModal({ visible, facility, onClose, onSaved }) {
  const [catalog, setCatalog] = useState({ facilities: [], coaches: [] });
  const [reviews, setReviews] = useState([]);
  const [targetType, setTargetType] = useState("facility");
  const [sport, setSport] = useState("");
  const [coach, setCoach] = useState("");
  const [rating, setRating] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const facilityId = String(facility?.id || facility?._id || "");

  useEffect(() => {
    if (!visible || !facilityId) return;
    let active = true;
    setLoading(true);
    setMessage("");
    Promise.all([citizenService.ratingCatalog(), citizenService.listReviews()])
      .then(([choices, history]) => {
        if (!active) return;
        setCatalog(choices);
        setReviews(history);
        setTargetType("facility");
        setSport("");
        setCoach("");
      })
      .catch((error) => active && setMessage(error.message || "Could not load rating choices."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [visible, facilityId]);

  const catalogFacility = catalog.facilities.find((item) => String(item._id) === facilityId);
  const sports = catalogFacility?.sports || [];
  const coaches = useMemo(
    () => catalog.coaches.filter((item) => String(item.SportComplexId?._id || item.SportComplexId) === facilityId),
    [catalog.coaches, facilityId]
  );
  const existing = reviews.find((item) => (
    item.targetType === targetType &&
    String(item.facility?._id || item.facility) === facilityId &&
    (targetType !== "sport" || String(item.sport?._id || item.sport) === sport) &&
    (targetType !== "coach" || String(item.coach?._id || item.coach) === coach)
  ));

  useEffect(() => {
    setRating(Number(existing?.rating) || 0);
    setRemarks(existing?.remarks || "");
  }, [existing?._id, targetType, sport, coach]);

  const changeTarget = (value) => {
    setTargetType(value);
    setSport("");
    setCoach("");
    setMessage("");
  };

  const submit = async () => {
    if (!rating) return setMessage("Select a star rating.");
    if (targetType === "sport" && !sport) return setMessage("Select a sport.");
    if (targetType === "coach" && !coach) return setMessage("Select a coach.");
    setSaving(true);
    setMessage("");
    try {
      const saved = await citizenService.submitReview({ targetType, facility: facilityId, sport, coach, rating, remarks });
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      setMessage(error.message || "Could not save the rating.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>SHARE YOUR EXPERIENCE</Text><Text style={styles.title}>Rate {facility?.name || "facility"}</Text></View><TouchableOpacity accessibilityLabel="Close rating" onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={24} color={colors.slate[700]} /></TouchableOpacity></View>
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.gov.primary} /><Text style={styles.muted}>Loading rating choices...</Text></View> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.label}>What would you like to rate?</Text>
        <View style={styles.targets}>{TARGETS.map((item) => <TouchableOpacity key={item.value} onPress={() => changeTarget(item.value)} style={[styles.target, targetType === item.value && styles.targetActive]}><Ionicons name={item.value === "facility" ? "business-outline" : item.value === "sport" ? "trophy-outline" : "person-outline"} size={20} color={targetType === item.value ? colors.gov.primary : colors.slate[500]} /><Text style={[styles.targetText, targetType === item.value && styles.targetTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>

        {targetType === "sport" ? <View style={styles.field}><Text style={styles.label}>Sport at this facility</Text><View style={styles.picker}><Picker selectedValue={sport} onValueChange={setSport}><Picker.Item label="Choose a sport" value="" />{sports.map((item) => <Picker.Item key={String(item.sport?._id)} label={item.sport?.SportName || "Sport"} value={String(item.sport?._id || "")} />)}</Picker></View>{!sports.length ? <Text style={styles.muted}>No sports are available to rate.</Text> : null}</View> : null}
        {targetType === "coach" ? <View style={styles.field}><Text style={styles.label}>Coach at this facility</Text><View style={styles.picker}><Picker selectedValue={coach} onValueChange={setCoach}><Picker.Item label="Choose a coach" value="" />{coaches.map((item) => <Picker.Item key={String(item._id)} label={item.userId?.Name || "Coach"} value={String(item._id)} />)}</Picker></View>{!coaches.length ? <Text style={styles.muted}>No active coaches are assigned to this facility.</Text> : null}</View> : null}

        <View style={styles.ratingBox}><Text style={styles.ratingPrompt}>How was your experience?</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <TouchableOpacity accessibilityLabel={`${value} stars`} key={value} onPress={() => setRating(value)}><Ionicons name={value <= rating ? "star" : "star-outline"} size={39} color={value <= rating ? "#F59E0B" : colors.slate[300]} /></TouchableOpacity>)}</View><Text style={styles.muted}>{rating ? ratingLabel[rating] : "Select 1 to 5 stars"}</Text></View>
        <View style={styles.field}><Text style={styles.label}>Comments (optional)</Text><TextInput style={styles.input} multiline maxLength={1000} placeholder="Tell us what went well or what can improve..." value={remarks} onChangeText={setRemarks} /></View>
        {existing ? <Text style={styles.notice}>You already rated this item. Saving will update your previous rating.</Text> : null}
        {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
        <TouchableOpacity disabled={saving || !rating || (targetType === "sport" && !sport) || (targetType === "coach" && !coach)} onPress={submit} style={[styles.submit, (saving || !rating) && styles.disabled]}><Ionicons name="star" size={18} color="white" /><Text style={styles.submitText}>{saving ? "Saving..." : existing ? "Update rating" : "Submit rating"}</Text></TouchableOpacity>
      </ScrollView>}
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7FAF8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", backgroundColor: "white" },
  eyebrow: { color: colors.gov.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { marginTop: 4, color: colors.slate[900], fontSize: 21, fontWeight: "800" },
  iconButton: { padding: 8, borderRadius: 12, backgroundColor: colors.slate[100] },
  content: { padding: 18, gap: 18, paddingBottom: 36 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  label: { color: colors.slate[700], fontSize: 12, fontWeight: "800" },
  muted: { color: colors.slate[500], fontSize: 12, textAlign: "center" },
  targets: { flexDirection: "row", gap: 8 },
  target: { flex: 1, alignItems: "center", gap: 7, paddingVertical: 14, borderWidth: 1, borderColor: colors.slate[200], borderRadius: 14, backgroundColor: "white" },
  targetActive: { borderColor: colors.gov.primary, backgroundColor: "#EAF7EF" },
  targetText: { color: colors.slate[600], fontSize: 12, fontWeight: "700" },
  targetTextActive: { color: colors.gov.primary },
  field: { gap: 8 },
  picker: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: 13, overflow: "hidden", backgroundColor: "white" },
  ratingBox: { alignItems: "center", gap: 11, padding: 20, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: colors.slate[200] },
  ratingPrompt: { color: colors.slate[800], fontSize: 15, fontWeight: "800" },
  stars: { flexDirection: "row", gap: 7 },
  input: { minHeight: 105, borderWidth: 1, borderColor: colors.slate[200], borderRadius: 13, padding: 13, backgroundColor: "white", color: colors.slate[800], textAlignVertical: "top" },
  notice: { padding: 12, borderRadius: 12, backgroundColor: "#FFFBEB", color: "#92400E", fontSize: 12, fontWeight: "600" },
  error: { padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 12, fontWeight: "700" },
  submit: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: colors.gov.primary },
  disabled: { opacity: 0.5 },
  submitText: { color: "white", fontSize: 14, fontWeight: "800" },
});
