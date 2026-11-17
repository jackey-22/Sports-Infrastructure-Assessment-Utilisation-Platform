import { Text, TextInput } from "../../components/AppText";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import CitizenHeader from "../../components/common/CitizenHeader";
import { coachService } from "../../services/coach/coachService";

export const RateAthleteScreen = ({ athlete, onBack, onSaved }) => {
  const [selectedAthlete, setSelectedAthlete] = useState(athlete || null);
  const [athletes, setAthletes] = useState(athlete ? [athlete] : []);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [loadingAthletes, setLoadingAthletes] = useState(!athlete);
  const [loadError, setLoadError] = useState("");
  const [fitness, setFitness] = useState(4.8);
  const [technique, setTechnique] = useState(4.5);
  const [discipline, setDiscipline] = useState(4.9);
  const [stamina, setStamina] = useState(4.4);
  const [tactics, setTactics] = useState(4.6);
  const [remarks, setRemarks] = useState(
    "Good baseline consistency and agility. Needs to sharpen cross-court net drops during high-pressure points."
  );

  const pillars = [
    { label: "1. Physical Fitness & Agility", val: fitness, set: setFitness, desc: "Speed, reaction time, and flexibility" },
    { label: "2. Technical Stroke Execution", val: technique, set: setTechnique, desc: "Smash power, clear depth, net accuracy" },
    { label: "3. Discipline & Work Ethic", val: discipline, set: setDiscipline, desc: "Punctuality, coachability, squad leadership" },
    { label: "4. Match Stamina & Endurance", val: stamina, set: setStamina, desc: "Performance maintenance in 3rd set" },
    { label: "5. Tactical Match Strategy", val: tactics, set: setTactics, desc: "Shot selection and opponent weakness exploit" },
  ];

  const overallScore = ((fitness + technique + discipline + stamina + tactics) / 5).toFixed(2);
  useEffect(() => {
    if (athlete) return undefined;
    let active = true;
    coachService.listRateableAthletes()
      .then((rows) => {
        if (active) setAthletes(rows);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Could not load athletes.");
      })
      .finally(() => {
        if (active) setLoadingAthletes(false);
      });
    return () => {
      active = false;
    };
  }, [athlete]);

  const filteredAthletes = athletes.filter((item) =>
    `${item.name} ${item.sport} ${item.ageGroup}`.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  const handleSave = () => {
    coachService.submitRating({
      ratingId: selectedAthlete?.ratingId,
      rating: overallScore,
      remarks,
      parameters: [
        { parameter: "Physical Fitness & Agility", value: fitness },
        { parameter: "Technical Stroke Execution", value: technique },
        { parameter: "Discipline & Work Ethic", value: discipline },
        { parameter: "Match Stamina & Endurance", value: stamina },
        { parameter: "Tactical Match Strategy", value: tactics },
      ],
    })
      .then(() => {
        Alert.alert("Rating Saved", `5-Pillar evaluation for ${selectedAthlete?.name || "Athlete"} recorded at ${overallScore} / 5.`);
        if (onSaved) onSaved();
        else if (onBack) onBack();
      })
      .catch((error) => {
        Alert.alert("Could not save rating", error.message || "Please try again.");
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <CitizenHeader
        title={selectedAthlete ? "Athlete Evaluation" : "Select Athlete"}
        subtitle={selectedAthlete
          ? `${selectedAthlete.sport} • ${selectedAthlete.ageGroup}`
          : "Choose an athlete to start a 5-pillar evaluation"}
        onBack={onBack}
        showBack
        watermarkIcon={selectedAthlete ? "ribbon" : "account-search"}
      />

      {!selectedAthlete ? (
        <ScrollView contentContainerStyle={styles.selectionContent} showsVerticalScrollIndicator={false}>
          <View style={styles.selectionIntro}>
            <View style={styles.selectionIcon}>
              <Ionicons name="people-outline" size={23} color={colors.gov.primary} />
            </View>
            <View style={styles.selectionCopy}>
              <Text style={styles.selectionTitle}>Who would you like to rate?</Text>
              <Text style={styles.selectionSub}>Select a player from your assigned athlete roster.</Text>
            </View>
          </View>

          <View style={styles.selectionSearch}>
            <Ionicons name="search" size={16} color={colors.slate[400]} />
            <TextInput
              style={styles.selectionSearchInput}
              placeholder="Search by name, sport or age group"
              placeholderTextColor={colors.slate[400]}
              value={athleteSearch}
              onChangeText={setAthleteSearch}
            />
          </View>

          {loadingAthletes ? <Text style={styles.stateText}>Loading athletes available for evaluation…</Text> : null}
          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          {filteredAthletes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.selectionCard}
              onPress={() => setSelectedAthlete(item)}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.selectionAthleteCopy}>
                <Text style={styles.selectionAthleteName}>{item.name}</Text>
                <Text style={styles.selectionAthleteMeta}>{item.sport} • {item.ageGroup} • {item.sessions} sessions</Text>
              </View>
              <View style={styles.selectionRating}>
                <Ionicons name="star" size={12} color={colors.gov.accent} />
                <Text style={styles.selectionRatingText}>{item.overall}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Score Badge Banner */}
        <View style={styles.scoreBanner}>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreEyebrow}>CURRENT ATHLETE</Text>
            <Text style={styles.athleteName}>{selectedAthlete.name}</Text>
            <Text style={styles.scoreBannerTitle}>Composite Skill Score</Text>
            <Text style={styles.scoreBannerSub}>Based on 5 weighted athletic parameters</Text>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>{overallScore}</Text>
            <Text style={styles.scoreCircleSub}>/ 5.0</Text>
          </View>
        </View>

        {/* 5-Pillar Steppers */}
        {pillars.map((p) => (
          <View key={p.label} style={styles.pillarCard}>
            <View style={styles.pillarHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.pillarTitle}>{p.label}</Text>
                <Text style={styles.pillarDesc}>{p.desc}</Text>
              </View>

              <View style={styles.stepperWrapper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => p.set(Math.max(1, Math.round((p.val - 0.5) * 10) / 10))}
                >
                  <Ionicons name="remove" size={16} color={colors.slate[700]} />
                </TouchableOpacity>

                <Text style={styles.stepValue}>{p.val.toFixed(1)}</Text>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => p.set(Math.min(5, Math.round((p.val + 0.5) * 10) / 10))}
                >
                  <Ionicons name="add" size={16} color={colors.slate[700]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= p.val ? "star" : star - 0.5 <= p.val ? "star-half" : "star-outline"}
                  size={18}
                  color={colors.gov.accent}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Coach Qualitative Remarks */}
        <View style={styles.card}>
          <Text style={styles.inputHeading}>COACH OBSERVATIONS & REMARKS</Text>
          <TextInput
            style={styles.remarksInput}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
            placeholder="Add specific tactical notes, tournament readiness recommendations..."
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Commit Skill Evaluation to SAG Records</Text>
          <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>
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
  selectionContent: {
    padding: 16,
    paddingBottom: 40,
  },
  selectionIntro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand.soft,
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
  },
  selectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginRight: 11,
  },
  selectionCopy: {
    flex: 1,
  },
  selectionTitle: {
    color: colors.slate[900],
    fontSize: 15,
    fontWeight: "800",
  },
  selectionSub: {
    color: colors.slate[600],
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  selectionSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 13,
    height: 46,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  selectionSearchInput: {
    flex: 1,
    color: colors.slate[800],
    fontSize: 13,
    marginLeft: 8,
  },
  selectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.soft,
    marginRight: 10,
  },
  avatarText: {
    color: colors.gov.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  selectionAthleteCopy: {
    flex: 1,
    marginRight: 7,
  },
  selectionAthleteName: {
    color: colors.slate[900],
    fontSize: 14,
    fontWeight: "800",
  },
  selectionAthleteMeta: {
    color: colors.slate[500],
    fontSize: 11,
    marginTop: 3,
  },
  selectionRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginRight: 7,
  },
  selectionRatingText: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 3,
  },
  stateText: {
    color: colors.slate[500],
    fontSize: 12,
    marginBottom: 12,
  },
  errorText: {
    color: colors.status.danger,
    fontSize: 12,
    marginBottom: 12,
  },
  scoreBanner: {
    backgroundColor: colors.brand.dark,
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreCopy: {
    flex: 1,
    marginRight: 10,
  },
  scoreEyebrow: {
    color: colors.brand.light,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  athleteName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  scoreBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  scoreBannerSub: {
    fontSize: 11,
    color: colors.brand.light,
    marginTop: 2,
  },
  scoreCircle: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  scoreCircleText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.gov.primary,
  },
  scoreCircleSub: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.slate[400],
  },
  pillarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
  },
  pillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate[900],
  },
  pillarDesc: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  stepperWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[100],
    borderRadius: 8,
    padding: 3,
  },
  stepBtn: {
    padding: 6,
    backgroundColor: "#ffffff",
    borderRadius: 6,
  },
  stepValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.slate[900],
    paddingHorizontal: 10,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
  },
  inputHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  remarksInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.slate[800],
    height: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default RateAthleteScreen;
