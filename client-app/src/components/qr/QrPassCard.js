import { Text } from "../AppText";
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors } from "../../theme/colors";

export const QrPassCard = ({
  passId = "PASS-GJ-2026-8812",
  userName = "Aarav Patel",
  roleName = "Athlete",
  facilityName = "SAG Khokhra Sports Complex",
  sport = "Badminton",
  validTill = "2026-12-31",
  status = "Active",
}) => {
  const qrPayload = JSON.stringify({
    passId,
    userName,
    facilityName,
    sport,
    validTill,
  });

  return (
    <View style={styles.cardContainer}>
      {/* Green Header Banner */}
      <View style={styles.headerBanner}>
        <View>
          <Text style={styles.govTitle}>GOVERNMENT OF GUJARAT</Text>
          <Text style={styles.sagSubtitle}>Sports Authority of Gujarat (SAG)</Text>
        </View>
        <View style={styles.activeTag}>
          <Text style={styles.activeTagText}>{status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* QR Code Container */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrPayload}
            size={160}
            color={colors.gov.dark}
            backgroundColor="#ffffff"
          />
          <Text style={styles.passIdText}>{passId}</Text>
        </View>

        {/* User & Facility Details */}
        <View style={styles.infoSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Beneficiary:</Text>
            <Text style={styles.detailValue}>{userName} ({roleName})</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sports Complex:</Text>
            <Text style={styles.detailValue}>{facilityName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Discipline:</Text>
            <Text style={styles.detailValue}>{sport}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valid Until:</Text>
            <Text style={[styles.detailValue, { color: colors.gov.primary, fontWeight: "700" }]}>
              {validTill}
            </Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Scan at complex gate for automated biometric / digital attendance entry.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBanner: {
    backgroundColor: colors.brand.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  govTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gov.accent,
    letterSpacing: 0.8,
  },
  sagSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  activeTag: {
    backgroundColor: colors.brand.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.brand.dark,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 16,
    alignItems: "center",
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: "center",
    marginBottom: 16,
  },
  passIdText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    color: colors.slate[700],
    marginTop: 8,
    letterSpacing: 0.5,
  },
  infoSection: {
    width: "100%",
    backgroundColor: colors.slate[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.slate[500],
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 12,
    color: colors.slate[900],
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  footerNote: {
    fontSize: 11,
    color: colors.slate[400],
    textAlign: "center",
    marginTop: 4,
  },
});

export default QrPassCard;
