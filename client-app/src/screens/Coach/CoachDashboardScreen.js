import React, { useEffect, useState } from "react";
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
import CitizenHeader from "../../components/common/CitizenHeader";
import { coachService } from "../../services/coach/coachService";

export const CoachDashboardScreen = ({ user, onLogout, onRateAthlete }) => {
  const [search, setSearch] = useState("");
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    coachService.listAthletes()
      .then((rows) => {
        if (active) setAthletes(rows);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load athletes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = athletes.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.ageGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CitizenHeader
        title="Coach Dashboard"
        subtitle="Manage athlete progress and evaluations"
        role={2}
        onLogout={onLogout}
        showLogout
        watermarkIcon="whistle"
      />

        {/* Coach summary */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeEyebrow}>GOOD MORNING, COACH</Text>
            <Text style={styles.welcomeTitle} numberOfLines={1}>
              {user?.Name || "Coach"}
            </Text>
            <Text style={styles.welcomeText}>
              Keep athlete assessments current and help every player progress.
            </Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Ionicons name="fitness-outline" size={28} color="#bbf7d0" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="people-outline" size={17} color={colors.gov.primary} />
            </View>
            <Text style={styles.metricValue}>{athletes.length}</Text>
            <Text style={styles.metricLabel}>Athletes in roster</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricIconGold]}>
              <Ionicons name="star-outline" size={17} color="#b45309" />
            </View>
            <Text style={styles.metricValue}>80%</Text>
            <Text style={styles.metricLabel}>Evaluations complete</Text>
          </View>
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
        {loading ? <Text style={styles.stateText}>Loading assigned athletes…</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Athletes List */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionHeading}>ATHLETE ROSTER</Text>
            <Text style={styles.sectionSubheading}>5-pillar performance evaluations</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filtered.length} active</Text>
          </View>
        </View>

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
    paddingBottom: 36,
  },
  welcomeCard: {
    marginHorizontal: 16,
    marginTop: -14,
    marginBottom: 14,
    borderRadius: 18,
    padding: 17,
    backgroundColor: colors.brand.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeCopy: {
    flex: 1,
    marginRight: 12,
  },
  welcomeEyebrow: {
    color: colors.brand.light,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  welcomeTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.soft,
  },
  metricIconGold: {
    backgroundColor: "#fef3c7",
  },
  metricValue: {
    color: colors.slate[900],
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  metricLabel: {
    color: colors.slate[500],
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionSubheading: {
    color: colors.slate[500],
    fontSize: 12,
    marginTop: 2,
  },
  countPill: {
    backgroundColor: colors.brand.soft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  countPillText: {
    color: colors.gov.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  searchBox: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.slate[800],
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[700],
    letterSpacing: 0.7,
  },
  athleteCard: {
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 10,
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
    fontWeight: "800",
    color: colors.slate[900],
  },
  athleteSub: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 3,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
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
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  lastRatedText: {
    fontSize: 10,
    color: colors.slate[400],
    flex: 1,
    marginRight: 8,
  },
  rateBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  rateBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  stateText: {
    color: colors.slate[500],
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorText: {
    color: colors.status.danger,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
});

export default CoachDashboardScreen;
