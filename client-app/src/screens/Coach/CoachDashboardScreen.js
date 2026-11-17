import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";
import { StatCard } from "../../components/common/StatCard";

const COACH_ATHLETES = [
  { id: "ath_1", name: "Aarav Patel", sport: "Badminton", ageGroup: "U-19", overall: 4.64, lastRated: "2026-10-24", sessions: 28 },
  { id: "ath_2", name: "Pooja Trivedi", sport: "Badminton", ageGroup: "U-17", overall: 4.20, lastRated: "2026-10-22", sessions: 25 },
  { id: "ath_3", name: "Mehul Joshi", sport: "Badminton", ageGroup: "U-19", overall: 3.85, lastRated: "2026-10-15", sessions: 20 },
  { id: "ath_4", name: "Ananya Desai", sport: "Badminton", ageGroup: "U-15", overall: 4.50, lastRated: "2026-10-28", sessions: 30 },
  { id: "ath_5", name: "Kavita Parmar", sport: "Badminton", ageGroup: "U-17", overall: 4.10, lastRated: "2026-10-12", sessions: 22 },
];

export const CoachDashboardScreen = ({ user, onLogout, onRateAthlete }) => {
  const [search, setSearch] = useState("");

  const filtered = COACH_ATHLETES.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.ageGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title="Coach Command Desk"
        subtitle="SAG Coaching Cell • Senior Badminton"
        role={2}
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* KPI Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="ENROLLED SQUAD"
            value={COACH_ATHLETES.length}
            subvalue="Badminton Athletes"
            icon={<Ionicons name="people" size={18} color={colors.gov.primary} />}
          />
          <StatCard
            label="EVALUATED"
            value="80%"
            subvalue="4 pending October rating"
            trend="Active"
            trendType="up"
            icon={<Ionicons name="star" size={18} color={colors.gov.accent} />}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.slate[400]} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search athlete by name or age group..."
            placeholderTextColor={colors.slate[400]}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Athletes List */}
        <Text style={styles.sectionHeading}>ATHLETE ROSTER & 5-PILLAR EVALUATIONS</Text>

        {filtered.map((athlete) => (
          <View key={athlete.id} style={styles.athleteCard}>
            <View style={styles.athleteTop}>
              <View style={styles.athleteInfo}>
                <Text style={styles.athleteName} numberOfLines={1} ellipsizeMode="tail">{athlete.name}</Text>
                <Text style={styles.athleteSub} numberOfLines={1} ellipsizeMode="tail">
                  {athlete.sport} • {athlete.ageGroup} • {athlete.sessions} Sessions
                </Text>
              </View>

              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={colors.gov.accent} />
                <Text style={styles.ratingBadgeText}>{athlete.overall} / 5</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.lastRatedText}>Last Evaluated: {athlete.lastRated}</Text>

              <TouchableOpacity
                style={styles.rateBtn}
                onPress={() => onRateAthlete && onRateAthlete(athlete)}
                activeOpacity={0.8}
              >
                <Text style={styles.rateBtnText}>Update Rating</Text>
                <Ionicons name="create-outline" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.slate[800],
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  athleteCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
  },
  athleteTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  athleteInfo: {
    flex: 1,
    marginRight: 8,
  },
  athleteName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate[900],
  },
  athleteSub: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  lastRatedText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  rateBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  rateBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default CoachDashboardScreen;
