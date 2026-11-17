import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import CitizenHeader from "../../components/common/CitizenHeader";
import { StatusBadge } from "../../components/common/StatusBadge";
import { FciGauge } from "../../components/common/FciGauge";

export const ComplexDetailScreen = ({ route, navigation, facility: propFacility, onBookSlot, onBack }) => {
  const facility = propFacility || (route && route.params && route.params.facility);

  if (!facility) {
    return (
      <SafeAreaView style={styles.container}>
        <CitizenHeader
          title="Facility Details"
          onBack={onBack}
          showBack
          watermarkIcon="stadium"
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No facility selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fciScore = facility.condition?.score || 88;

  return (
    <View style={styles.container}>
      <CitizenHeader
        title={facility.name}
        subtitle={`${facility.district} • ${facility.category || "SAG Complex"}`}
        onBack={onBack}
        showBack
        watermarkIcon="stadium"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image
          source={{
            uri:
              facility.picture ||
              "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
          }}
          style={styles.heroImage}
        />

        <View style={styles.mainInfoCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.facilityName} numberOfLines={1} ellipsizeMode="tail">
                {facility.name}
              </Text>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">
                {facility.location || facility.district}
              </Text>
            </View>
            <StatusBadge status={fciScore >= 85 ? "grade a" : fciScore >= 70 ? "grade b" : "grade c"} />
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{facility.areaAcres || "14.5"} Acres</Text>
              <Text style={styles.metricKey}>Total Area</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{facility.operationalSince || "2016"}</Text>
              <Text style={styles.metricKey}>Operational</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>SAG Gujarat</Text>
              <Text style={styles.metricKey}>Authority</Text>
            </View>
          </View>
        </View>

        {/* Facility Condition Index (FCI) */}
        <FciGauge score={fciScore} showDetails={true} />

        {/* Amenities Grid */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>INFRASTRUCTURE AMENITIES</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <Ionicons name="flash" size={18} color={facility.amenities?.floodlights ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>Floodlights (850 Lux)</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="water" size={18} color={facility.amenities?.drinkingWater ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>RO Drinking Water</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="shirt" size={18} color={facility.amenities?.changingRooms ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>Locker & Changing</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="medkit" size={18} color={facility.amenities?.firstAid ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>First Aid Room</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="car" size={18} color={facility.amenities?.parking ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>Dedicated Parking</Text>
            </View>
            <View style={styles.amenityItem}>
              <Ionicons name="body" size={18} color={facility.amenities?.divyangjanFriendly ? colors.gov.primary : colors.slate[400]} />
              <Text style={styles.amenityLabel}>Divyangjan Ramp</Text>
            </View>
          </View>
        </View>

        {/* Manager & Staff Contact */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ADMINISTRATION & CONTACT</Text>
          <View style={styles.contactRow}>
            <Ionicons name="person-circle-outline" size={32} color={colors.gov.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.contactName}>{facility.contactPerson || "Facility Manager (SAG)"}</Text>
              <Text style={styles.contactSub}>{facility.contactPhone || "+91 79 2216 4800"} • {facility.contactEmail || "contact@sag.gujarat.gov.in"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Pay & Play Pass</Text>
          <Text style={styles.priceValue}>₹50 <Text style={styles.priceUnit}>/ session</Text></Text>
        </View>

        <TouchableOpacity
          style={styles.bookNowBtn}
          onPress={() => {
            if (onBookSlot) {
              onBookSlot(facility);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.bookNowText}>Book Court Slot</Text>
          <Ionicons name="ticket" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    paddingBottom: 90,
  },
  heroImage: {
    width: "100%",
    height: 200,
    backgroundColor: colors.slate[300],
  },
  mainInfoCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.slate[900],
  },
  addressText: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  metricItem: {
    alignItems: "center",
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900],
  },
  metricKey: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.slate[200],
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    gap: 8,
  },
  amenityLabel: {
    fontSize: 12,
    color: colors.slate[700],
    fontWeight: "500",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[900],
  },
  contactSub: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 11,
    color: colors.slate[500],
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gov.primary,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.slate[400],
    fontWeight: "500",
  },
  bookNowBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bookNowText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.slate[500],
    fontSize: 14,
  },
});

export default ComplexDetailScreen;
