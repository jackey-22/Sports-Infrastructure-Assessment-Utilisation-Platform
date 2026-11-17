import { Text, TextInput } from "../../components/AppText";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";

export const FacilityAuditScreen = ({ onBack, onAuditComplete }) => {
  const [turfScore, setTurfScore] = useState(90);
  const [floodlightLux, setFloodlightLux] = useState("850");
  const [sanitationScore, setSanitationScore] = useState(88);
  const [accessibilityScore, setAccessibilityScore] = useState(95);
  const [photoUri, setPhotoUri] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [inspectorNotes, setInspectorNotes] = useState(
    "Court 1 & 2 synthetic mats show minimal seam wear. Floodlight lux verified at 850 across all 4 quadrants."
  );

  const calculatedFci = Math.round(
    (turfScore * 0.35) +
    (Math.min(100, (parseInt(floodlightLux) || 0) / 10) * 0.25) +
    (sanitationScore * 0.20) +
    (accessibilityScore * 0.20)
  );

  const handleCapturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required for AI Vision infrastructure audit.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmitAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      Alert.alert(
        "FCI Audit Logged",
        `Facility Condition Index calculated at ${calculatedFci} / 100 (Grade A). Dispatched to District Sports Officer & State SAG Quality Cell.`
      );
      if (onAuditComplete) onAuditComplete(calculatedFci);
      else if (onBack) onBack();
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="FCI Condition Audit"
        subtitle="SAG Infrastructure Quality Framework"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic FCI Score Banner */}
        <View style={styles.scoreBanner}>
          <View>
            <Text style={styles.scoreBannerTitle}>Live Calculated FCI</Text>
            <Text style={styles.scoreBannerSub}>Weighted composite quality index</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{calculatedFci}</Text>
            <Text style={styles.scoreGrade}>
              {calculatedFci >= 85 ? "Grade A" : calculatedFci >= 70 ? "Grade B" : "Grade C"}
            </Text>
          </View>
        </View>

        {/* 1. Turf & Court Wear */}
        <View style={styles.auditCard}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditTitle}>1. Turf & Surface Condition (35%)</Text>
            <Text style={styles.auditVal}>{turfScore}%</Text>
          </View>
          <Text style={styles.auditSub}>Checks for seam tears, shock-pad resilience, grip coefficient</Text>
          <View style={styles.stepperRow}>
            {[70, 80, 85, 90, 95].map((score) => (
              <TouchableOpacity
                key={score}
                style={[styles.chip, turfScore === score && styles.chipActive]}
                onPress={() => setTurfScore(score)}
              >
                <Text style={[styles.chipText, turfScore === score && styles.chipTextActive]}>
                  {score}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. Floodlight Lux Measurement */}
        <View style={styles.auditCard}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditTitle}>2. Floodlight Illumination (25%)</Text>
            <Text style={styles.auditVal}>{floodlightLux} Lux</Text>
          </View>
          <Text style={styles.auditSub}>National standard for indoor badminton: 750 - 1000 Lux</Text>
          <TextInput
            style={styles.textInput}
            value={floodlightLux}
            onChangeText={setFloodlightLux}
            keyboardType="number-pad"
            placeholder="Enter measured lux"
          />
        </View>

        {/* 3. Sanitation & Water */}
        <View style={styles.auditCard}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditTitle}>3. Sanitation & Hygiene (20%)</Text>
            <Text style={styles.auditVal}>{sanitationScore}%</Text>
          </View>
          <Text style={styles.auditSub}>Cleanliness of washrooms, RO water TDS, locker hygiene</Text>
          <View style={styles.stepperRow}>
            {[65, 75, 85, 90, 95].map((score) => (
              <TouchableOpacity
                key={score}
                style={[styles.chip, sanitationScore === score && styles.chipActive]}
                onPress={() => setSanitationScore(score)}
              >
                <Text style={[styles.chipText, sanitationScore === score && styles.chipTextActive]}>
                  {score}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Divyangjan Accessibility */}
        <View style={styles.auditCard}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditTitle}>4. Divyangjan Barrier-Free Access (20%)</Text>
            <Text style={styles.auditVal}>{accessibilityScore}%</Text>
          </View>
          <Text style={styles.auditSub}>Ramp gradient (1:12), tactile indicators, wheelchair access</Text>
          <View style={styles.stepperRow}>
            {[70, 80, 90, 95, 100].map((score) => (
              <TouchableOpacity
                key={score}
                style={[styles.chip, accessibilityScore === score && styles.chipActive]}
                onPress={() => setAccessibilityScore(score)}
              >
                <Text style={[styles.chipText, accessibilityScore === score && styles.chipTextActive]}>
                  {score}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Camera Snapshot for AI Vision Audit */}
        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>PHOTO AUDIT EVIDENCE (AI VISION)</Text>
          <Text style={styles.auditSub}>Capture high-resolution ground photo for computer vision evaluation</Text>

          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.retakeBtn}>
                <Ionicons name="camera" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapturePhoto}>
              <Ionicons name="camera" size={22} color={colors.gov.primary} style={{ marginRight: 8 }} />
              <Text style={styles.captureBtnText}>Capture Audit Photo Evidence</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Audit Inspector Notes */}
        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>OFFICIAL AUDIT OBSERVATIONS</Text>
          <TextInput
            style={styles.notesInput}
            value={inspectorNotes}
            onChangeText={setInspectorNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmitAudit}
          disabled={isAuditing}
        >
          {isAuditing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Official FCI Audit Report</Text>
              <Ionicons name="shield-checkmark" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scoreBanner: {
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  scoreBannerSub: {
    fontSize: 11,
    color: colors.brand.light,
    marginTop: 2,
  },
  scoreBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.gov.primary,
  },
  scoreGrade: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.slate[600],
    textTransform: "uppercase",
  },
  auditCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
  },
  auditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[900],
  },
  auditVal: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.gov.primary,
  },
  auditSub: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  chipActive: {
    backgroundColor: colors.brand.dark,
    borderColor: colors.brand.dark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[700],
  },
  chipTextActive: {
    color: "#ffffff",
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: colors.slate[900],
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.soft,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  captureBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gov.primary,
  },
  photoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  previewImage: {
    width: "100%",
    height: 140,
  },
  retakeBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  notesInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: colors.slate[800],
    height: 70,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default FacilityAuditScreen;
