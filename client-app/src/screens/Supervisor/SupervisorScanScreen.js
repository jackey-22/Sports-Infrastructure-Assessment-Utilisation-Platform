import { Text } from "../../components/AppText";
import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";
import { QrScannerModal } from "../../components/qr/QrScannerModal";
import { StatusBadge } from "../../components/common/StatusBadge";

export const SupervisorScanScreen = ({ user, onLogout }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedPass, setScannedPass] = useState(null);
  const [recentScans, setRecentScans] = useState([
    { id: "1", name: "Aarav Patel", sport: "Badminton", passId: "PASS-GJ-2026-8812", time: "06:14 AM", status: "Verified" },
    { id: "2", name: "Pooja Trivedi", sport: "Athletics", passId: "PASS-GJ-2026-7241", time: "06:18 AM", status: "Verified" },
    { id: "3", name: "Mehul Joshi", sport: "Swimming", passId: "PASS-GJ-2026-3190", time: "06:22 AM", status: "Verified" },
  ]);

  const handleScanResult = (data) => {
    setIsScannerOpen(false);
    try {
      const parsed = JSON.parse(data);
      setScannedPass(parsed);
    } catch (e) {
      // In case it's a simple string pass ID
      setScannedPass({
        passId: data,
        userName: "Aarav Patel",
        sport: "Badminton Court 1",
        facilityName: "SAG Khokhra Sports Complex",
        validTill: "2026-12-31",
      });
    }
  };

  const handleConfirmAttendance = () => {
    if (!scannedPass) return;
    const newEntry = {
      id: String(Date.now()),
      name: scannedPass.userName || "Verified Athlete",
      sport: scannedPass.sport || "Badminton",
      passId: scannedPass.passId || "PASS-VERIFIED",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Verified",
    };
    setRecentScans([newEntry, ...recentScans]);
    setScannedPass(null);
    Alert.alert("Attendance Marked", `Digital gate entry recorded for ${newEntry.name}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="Gate Scanner Desk"
        subtitle="SAG Gate Check-In & Verification"
        role={1}
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Scanner Trigger Hero Card */}
        <View style={styles.scanHeroCard}>
          <View style={styles.qrIconCircle}>
            <Ionicons name="qr-code" size={36} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>Camera QR Pass Scanner</Text>
          <Text style={styles.heroSub}>
            Scan athlete & citizen digital gate passes using device camera for instant attendance logging.
          </Text>

          <TouchableOpacity
            style={styles.openScannerBtn}
            onPress={() => setIsScannerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.openScannerBtnText}>Open Camera Scanner</Text>
          </TouchableOpacity>
        </View>

        {/* Gate Stats Today */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{recentScans.length + 42}</Text>
            <Text style={styles.statLabel}>Checked-In Today</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.gov.primary }]}>100%</Text>
            <Text style={styles.statLabel}>Valid Passes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.gov.accent }]}>0</Text>
            <Text style={styles.statLabel}>Gate Violations</Text>
          </View>
        </View>

        {/* Live Scanned Entry Feed */}
        <Text style={styles.feedHeading}>RECENT GATE VERIFICATIONS</Text>

        {recentScans.map((scan) => (
          <View key={scan.id} style={styles.scanItem}>
            <View style={styles.scanLeft}>
              <View style={styles.verifiedDot} />
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.athleteName}>{scan.name}</Text>
                <Text style={styles.scanMeta}>{scan.sport} • {scan.passId}</Text>
              </View>
            </View>

            <View style={styles.scanRight}>
              <Text style={styles.scanTime}>{scan.time}</Text>
              <StatusBadge status="resolved" size="sm" />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* QR Camera Modal */}
      <QrScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
        title="Scan Athlete QR Pass"
      />

      {/* Scanned Pass Validation Bottom Sheet */}
      {scannedPass && (
        <Modal visible={!!scannedPass} animationType="slide" transparent onRequestClose={() => setScannedPass(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.validateSheet}>
              <View style={styles.validHeader}>
                <Ionicons name="checkmark-circle" size={32} color={colors.gov.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.validTitle}>Valid SAG Digital Pass</Text>
                  <Text style={styles.validSub}>{scannedPass.passId}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Beneficiary Name:</Text>
                  <Text style={styles.infoVal}>{scannedPass.userName || "Aarav Patel"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Discipline / Court:</Text>
                  <Text style={styles.infoVal}>{scannedPass.sport || "Badminton Court 1"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Sports Complex:</Text>
                  <Text style={styles.infoVal}>{scannedPass.facilityName || "SAG Khokhra"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Valid Until:</Text>
                  <Text style={[styles.infoVal, { color: colors.gov.primary }]}>
                    {scannedPass.validTill || "2026-12-31"}
                  </Text>
                </View>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setScannedPass(null)}>
                  <Text style={styles.cancelBtnText}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAttendance}>
                  <Text style={styles.confirmBtnText}>Confirm Entry & Attendance</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  scanHeroCard: {
    backgroundColor: colors.brand.dark,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  qrIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroSub: {
    fontSize: 12,
    color: colors.brand.light,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  openScannerBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  openScannerBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  statsRow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statBox: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.slate[900],
  },
  statLabel: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.slate[200],
  },
  feedHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  scanItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scanLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  verifiedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gov.primary,
  },
  athleteName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[900],
  },
  scanMeta: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  scanRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  scanTime: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  validateSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  validHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  validTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.slate[900],
  },
  validSub: {
    fontSize: 12,
    color: colors.gov.primary,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoKey: {
    fontSize: 12,
    color: colors.slate[500],
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[900],
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: colors.slate[700],
    fontWeight: "700",
    fontSize: 14,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default SupervisorScanScreen;
