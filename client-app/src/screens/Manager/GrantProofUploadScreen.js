import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import { Text, TextInput } from "../../components/AppText";
import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../theme/colors";
export const GrantProofUploadScreen = ({
  onBack,
  onSubmitted
}) => {
  const [grantId] = useState("SAG-MOD-2026-081");
  const [milestoneName, setMilestoneName] = useState("Milestone 2: Court 1-2 Mat Laying & Adhesive Cure");
  const [invoiceAmount, setInvoiceAmount] = useState("3,50,000");
  const [contractorName, setContractorName] = useState("Apex Sports Infra Pvt Ltd");
  const [proofPhoto, setProofPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const handlePickPhoto = async () => {
    const {
      status
    } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Gallery permission is needed to attach invoice documents.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProofPhoto(result.assets[0].uri);
    }
  };
  const handleCapturePhoto = async () => {
    const {
      status
    } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is needed to capture physical work site evidence.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProofPhoto(result.assets[0].uri);
    }
  };
  const handleSubmit = () => {
    if (!invoiceAmount.trim() || !milestoneName.trim()) {
      Alert.alert("Required", "Please fill milestone title and invoice amount.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert("Proof Submitted to SAG Admin", `Milestone evidence for ${grantId} has been submitted for State verification and second tranche disbursement.`);
      if (onSubmitted) onSubmitted();else if (onBack) onBack();
    }, 1200);
  };
  return <View style={styles.container}>


      <AppScreenScroll contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} header={<AppHeader title="Submit Grant Proof" subtitle="Modernization Grant Utilization Verification" onBack={onBack} />}>
        {/* Grant Meta Header Card */}
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>ACTIVE SANCTION NUMBER</Text>
          <Text style={styles.grantIdText}>{grantId}</Text>
          <Text style={styles.grantPurpose}>Badminton Synthetic Mat & LED Lux Upgrade</Text>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetVal}>Total Sanction: ₹12,50,000</Text>
            <Text style={styles.budgetReleased}>Released: ₹7,50,000 (60%)</Text>
          </View>
        </View>

        {/* Milestone Form */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>WORK MILESTONE DETAILS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>COMPLETED MILESTONE DESCRIPTION</Text>
            <TextInput style={styles.textInput} value={milestoneName} onChangeText={setMilestoneName} placeholder="e.g. Synthetic Court Floor Laying Completed" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>INVOICE EXPENDITURE AMOUNT (₹)</Text>
            <TextInput style={styles.textInput} value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="number-pad" placeholder="e.g. 3,50,000" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONTRACTOR / VENDOR NAME</Text>
            <TextInput style={styles.textInput} value={contractorName} onChangeText={setContractorName} placeholder="Contractor Name / Agency" />
          </View>
        </View>

        {/* Photographic Evidence Attachment */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>SITE WORK PHOTOGRAPHIC EVIDENCE</Text>
          <Text style={styles.sectionSub}>Attach on-ground photos showing physical completion</Text>

          {proofPhoto ? <View style={styles.photoContainer}>
              <Image source={{
            uri: proofPhoto
          }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity onPress={() => setProofPhoto(null)} style={styles.removeBtn}>
                <Ionicons name="trash" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View> : <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleCapturePhoto}>
                <Ionicons name="camera" size={18} color={colors.gov.primary} style={{
              marginRight: 6
            }} />
                <Text style={styles.actionBtnText}>Capture Work Site</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handlePickPhoto}>
                <Ionicons name="document-attach" size={18} color={colors.gov.primary} style={{
              marginRight: 6
            }} />
                <Text style={styles.actionBtnText}>Attach Invoice / Bill</Text>
              </TouchableOpacity>
            </View>}
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <>
              <Text style={styles.submitBtnText}>Submit for State Admin Verification</Text>
              <Ionicons name="cloud-upload" size={18} color="#ffffff" style={{
            marginLeft: 6
          }} />
            </>}
        </TouchableOpacity>
      </AppScreenScroll>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50]
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  metaCard: {
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gov.accent,
    letterSpacing: 0.8
  },
  grantIdText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2
  },
  grantPurpose: {
    fontSize: 13,
    color: colors.brand.light,
    marginTop: 4
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)"
  },
  budgetVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  budgetReleased: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.accent
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 8
  },
  sectionSub: {
    fontSize: 11,
    color: colors.slate[400],
    marginBottom: 12
  },
  inputGroup: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[600],
    marginBottom: 4
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: colors.slate[900]
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.soft,
    borderRadius: 10,
    paddingVertical: 12
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.primary
  },
  photoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: 140
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    padding: 6
  },
  submitBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  }
});
export default GrantProofUploadScreen;
