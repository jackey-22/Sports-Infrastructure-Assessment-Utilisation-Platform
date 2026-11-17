import { Text, TextInput } from "../../components/AppText";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";
import { GUJARAT_FACILITIES } from "../../data/gujaratSportsData";

const GRANT_PURPOSES = [
  "Synthetic Turf & Court Resurfacing",
  "LED Floodlight 850 Lux Conversion",
  "Divyangjan Barrier-Free Access Ramp",
  "High-Capacity RO Drinking Water Plant",
  "Olympic Fitness Center & Gym Modernization",
  "Fire Safety & Perimeter Security Upgrade",
];

export const GrantAllocationScreen = ({ onBack, onAllocated }) => {
  const [selectedFacility, setSelectedFacility] = useState(GUJARAT_FACILITIES[0]?.name || "SAG Khokhra Sports Complex");
  const [purpose, setPurpose] = useState(GRANT_PURPOSES[0]);
  const [amount, setAmount] = useState("15,00,000");
  const [initialTranche, setInitialTranche] = useState("50");
  const [submitting, setSubmitting] = useState(false);

  const handleAllocate = () => {
    if (!amount.trim()) {
      Alert.alert("Input Required", "Please specify the grant sanction amount.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const grantId = `SAG-MOD-2026-${Math.floor(100 + Math.random() * 900)}`;
      Alert.alert(
        "Grant Sanctioned",
        `Sanction Order #${grantId} issued for ${selectedFacility} with initial tranche of ${initialTranche}% disbursed.`
      );
      if (onAllocated) onAllocated();
      else if (onBack) onBack();
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="Sanction State Grant"
        subtitle="SAG Infrastructure Capital Budget"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Capital Infrastructure Sanction Desk</Text>
          <Text style={styles.bannerSub}>
            Disburse development and maintenance funds directly to SAG Sports Complexes with milestone-linked tranches.
          </Text>
        </View>

        {/* Complex Picker */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>BENEFICIARY SPORTS COMPLEX</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {GUJARAT_FACILITIES.slice(0, 6).map((fac) => (
              <TouchableOpacity
                key={fac.id}
                style={[styles.chip, selectedFacility === fac.name && styles.chipActive]}
                onPress={() => setSelectedFacility(fac.name)}
              >
                <Text style={[styles.chipText, selectedFacility === fac.name && styles.chipTextActive]}>
                  {fac.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Grant Purpose */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>GRANT PURPOSE & OBJECTIVE</Text>
          <View style={styles.purposesList}>
            {GRANT_PURPOSES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.purposeRow, purpose === item && styles.purposeRowActive]}
                onPress={() => setPurpose(item)}
              >
                <Ionicons
                  name={purpose === item ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={purpose === item ? colors.gov.primary : colors.slate[400]}
                />
                <Text style={[styles.purposeText, purpose === item && styles.purposeTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Financial Details */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>FINANCIAL ALLOCATION</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SANCTION BUDGET (₹)</Text>
            <TextInput
              style={styles.textInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="e.g. 15,00,000"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>INITIAL ADVANCE TRANCHE RELEASE (%)</Text>
            <View style={styles.trancheRow}>
              {["30", "40", "50", "60", "75"].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.trancheBtn, initialTranche === pct && styles.trancheBtnActive]}
                  onPress={() => setInitialTranche(pct)}
                >
                  <Text style={[styles.trancheText, initialTranche === pct && styles.trancheTextActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleAllocate} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Sanction & Disburse State Grant</Text>
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
  banner: {
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  bannerSub: {
    fontSize: 11,
    color: colors.brand.light,
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  chipActive: {
    backgroundColor: colors.brand.dark,
    borderColor: colors.brand.dark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[700],
  },
  chipTextActive: {
    color: "#ffffff",
  },
  purposesList: {
    gap: 8,
  },
  purposeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.slate[50],
    gap: 10,
  },
  purposeRowActive: {
    backgroundColor: colors.brand.soft,
  },
  purposeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[700],
    flex: 1,
  },
  purposeTextActive: {
    color: colors.gov.primary,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[600],
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.slate[900],
  },
  trancheRow: {
    flexDirection: "row",
    gap: 8,
  },
  trancheBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    alignItems: "center",
  },
  trancheBtnActive: {
    backgroundColor: colors.gov.primary,
  },
  trancheText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[700],
  },
  trancheTextActive: {
    color: "#ffffff",
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

export default GrantAllocationScreen;
