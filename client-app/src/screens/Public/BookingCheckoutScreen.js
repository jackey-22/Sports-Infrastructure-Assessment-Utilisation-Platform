import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";
import { QrPassCard } from "../../components/qr/QrPassCard";

const TIME_SLOTS = [
  { id: "slot_1", label: "06:00 AM - 07:00 AM", period: "Morning" },
  { id: "slot_2", label: "07:00 AM - 08:00 AM", period: "Morning" },
  { id: "slot_3", label: "08:00 AM - 09:00 AM", period: "Morning" },
  { id: "slot_4", label: "05:00 PM - 06:00 PM", period: "Evening" },
  { id: "slot_5", label: "06:00 PM - 07:00 PM", period: "Evening" },
  { id: "slot_6", label: "07:00 PM - 08:00 PM", period: "Evening" },
];

export const BookingCheckoutScreen = ({ facility, onBack, onDone }) => {
  const [selectedSport, setSelectedSport] = useState("Badminton");
  const [selectedSlot, setSelectedSlot] = useState("slot_4");
  const [name, setName] = useState("Aarav Patel");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedPass, setGeneratedPass] = useState(null);

  const handleConfirmBooking = () => {
    if (!name || !phone) {
      Alert.alert("Required", "Please provide beneficiary name and contact number.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const newPass = {
        passId: `PASS-SAG-${Math.floor(100000 + Math.random() * 900000)}`,
        userName: name,
        facilityName: facility?.name || "SAG Khokhra Sports Complex",
        sport: selectedSport,
        validTill: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        status: "Active",
      };
      setGeneratedPass(newPass);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title={generatedPass ? "Digital Gate Pass" : "Instant Slot Booking"}
        subtitle={facility?.name || "Sports Authority of Gujarat"}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {generatedPass ? (
          <View style={styles.successSection}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={48} color={colors.gov.primary} />
              <Text style={styles.successTitle}>Booking Confirmed & QR Pass Issued</Text>
              <Text style={styles.successSub}>
                Present this digital QR pass at the entrance gate for automated digital check-in.
              </Text>
            </View>

            <QrPassCard
              passId={generatedPass.passId}
              userName={generatedPass.userName}
              facilityName={generatedPass.facilityName}
              sport={generatedPass.sport}
              validTill={generatedPass.validTill}
              status="Active"
            />

            <TouchableOpacity style={styles.doneBtn} onPress={onDone || onBack}>
              <Text style={styles.doneBtnText}>Return to Facilities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Sport Discipline Picker */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>SELECT DISCIPLINE</Text>
              <View style={styles.sportsRow}>
                {["Badminton", "Cricket", "Athletics", "Swimming", "Table Tennis"].map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
                    onPress={() => setSelectedSport(sport)}
                  >
                    <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                      {sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Slot Picker */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>SELECT SESSION TIME SLOT</Text>
              <View style={styles.slotsGrid}>
                {TIME_SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.slotItem, selectedSlot === slot.id && styles.slotItemActive]}
                    onPress={() => setSelectedSlot(slot.id)}
                  >
                    <Text style={[styles.slotPeriod, selectedSlot === slot.id && styles.slotTextActive]}>
                      {slot.period}
                    </Text>
                    <Text style={[styles.slotTime, selectedSlot === slot.id && styles.slotTextActive]}>
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Athlete Contact Info */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>BENEFICIARY DETAILS</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Athlete / Citizen Name"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MOBILE NUMBER (FOR SMS OTP & PASS)</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Price Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subsidized Pay & Play Fee:</Text>
                <Text style={styles.summaryValue}>₹50.00</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SAG Gujarat Facility Tax (0%):</Text>
                <Text style={styles.summaryValue}>₹0.00</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable:</Text>
                <Text style={styles.totalValue}>₹50.00</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.payBtn}
              onPress={handleConfirmBooking}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.payBtnText}>Pay ₹50 & Generate Digital Pass</Text>
                  <Ionicons name="shield-checkmark" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  sportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  sportChipActive: {
    backgroundColor: colors.gov.primary,
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[700],
  },
  sportChipTextActive: {
    color: "#ffffff",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotItem: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  slotItemActive: {
    backgroundColor: colors.brand.dark,
    borderColor: colors.brand.dark,
  },
  slotPeriod: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gov.accent,
    textTransform: "uppercase",
  },
  slotTime: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[800],
    marginTop: 2,
  },
  slotTextActive: {
    color: "#ffffff",
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[500],
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.slate[900],
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.slate[600],
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate[900],
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.slate[900],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gov.primary,
  },
  payBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  successSection: {
    alignItems: "center",
  },
  successBadge: {
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate[900],
    marginTop: 8,
    textAlign: "center",
  },
  successSub: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  doneBtn: {
    backgroundColor: colors.brand.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  doneBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default BookingCheckoutScreen;
