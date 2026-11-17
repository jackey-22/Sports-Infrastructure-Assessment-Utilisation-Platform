import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { SagHeader } from "../../components/common/SagHeader";

export const RateAthleteScreen = ({ athlete, onBack, onSaved }) => {
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

  const handleSave = () => {
    Alert.alert("Rating Saved", `5-Pillar evaluation for ${athlete?.name || "Athlete"} recorded at ${overallScore} / 5.`);
    if (onSaved) onSaved();
    else if (onBack) onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <SagHeader
        title={`Evaluate: ${athlete?.name || "Aarav Patel"}`}
        subtitle={`${athlete?.sport || "Badminton"} • ${athlete?.ageGroup || "U-19"}`}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Score Badge Banner */}
        <View style={styles.scoreBanner}>
          <View>
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
    padding: 16,
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
    fontSize: 13,
    fontWeight: "700",
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
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default RateAthleteScreen;
