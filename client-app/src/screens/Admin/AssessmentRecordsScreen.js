import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text } from "../../components/AppText";
import { api } from "../../api/client";
import { colors } from "../../theme/colors";
import { formatDate } from "../../utils/manager/managerUtils";

function scoreOf(assessment) {
  return assessment.ai?.status === "completed"
    ? assessment.ai.visualConditionIndex
    : assessment.score;
}

export default function AssessmentRecordsScreen({ onBack }) {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/admin/assessments");
      setRecords(response.assessments || []);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppScreenScroll
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.gov.primary]} />}
      header={(
        <AppHeader
          title={selected ? selected.sportName || "Assessment result" : "Condition assessments"}
          subtitle={selected ? selected.facilityName : "Manager submissions and evidence"}
          onBack={selected ? () => setSelected(null) : onBack}
        />
      )}
    >
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loading && !records.length ? <ActivityIndicator color={colors.gov.primary} /> : selected ? (
        <>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text style={styles.heading}>{selected.facilityName}</Text>
                <Text style={styles.body}>{selected.sportName || "Facility-wide assessment"} · {selected.date ? formatDate(selected.date) : "Date unavailable"}</Text>
              </View>
              <Text style={styles.score}>{scoreOf(selected) == null ? "—" : `${scoreOf(selected)}/100`}</Text>
            </View>
            <Text style={styles.label}>Assessment result</Text>
            <Text style={styles.body}>{selected.ai?.overallSummary || selected.summary || "No summary recorded."}</Text>
            {!!selected.ai?.categories?.length && (
              <View style={styles.findings}>
                <Text style={styles.heading}>Category findings</Text>
                {selected.ai.categories.map((category) => (
                  <View key={category.id} style={styles.finding}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.label, styles.flex]}>{category.label}</Text>
                      <Text style={styles.severity}>{category.observable ? category.severity : "not visible"}</Text>
                    </View>
                    <Text style={styles.body}>{category.condition}</Text>
                    {category.defects?.map((defect, index) => <Text key={`${defect.description}-${index}`} style={styles.defect}>• {defect.description}</Text>)}
                    {!!category.maintenance && <Text style={styles.action}>Action: {category.maintenance}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
          {!!selected.photos?.length && (
            <View style={styles.card}>
              <Text style={styles.heading}>Assessment photos</Text>
              <View style={styles.photoGrid}>
                {selected.photos.map((value, index) => {
                  const photo = typeof value === "string" ? { filename: value } : value;
                  return (
                    <View key={photo.key || photo.url || `${photo.filename}-${index}`} style={styles.evidence}>
                      {!!photo.url && <Image source={{ uri: photo.url }} style={styles.photo} accessibilityLabel={`Assessment photo ${index + 1}`} />}
                      <Text style={styles.photoMeta}>{photo.filename || `Photo ${index + 1}`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </>
      ) : records.length ? records.map((record) => (
        <TouchableOpacity key={record.id} style={styles.card} onPress={() => setSelected(record)} accessibilityRole="button">
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text style={styles.heading}>{record.facilityName}</Text>
              <Text style={styles.body}>{record.sportName || "Facility-wide assessment"}</Text>
              <Text style={styles.meta}>{record.date ? formatDate(record.date) : "Date unavailable"} · {record.inspector || "Manager"}</Text>
            </View>
            <Text style={styles.score}>{scoreOf(record) == null ? "—" : `${scoreOf(record)}/100`}</Text>
          </View>
        </TouchableOpacity>
      )) : <Text style={styles.body}>No saved assessments yet.</Text>}
    </AppScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.surface.card, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1, gap: 3 },
  heading: { fontSize: 16, fontWeight: "800", color: colors.brand.dark },
  body: { fontSize: 13, lineHeight: 20, color: colors.slate[700] },
  meta: { fontSize: 11, color: colors.slate[500] },
  label: { marginTop: 4, fontSize: 12, fontWeight: "800", color: colors.slate[800] },
  score: { fontSize: 18, fontWeight: "800", color: colors.gov.primary },
  error: { color: colors.status.danger, fontWeight: "700" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  evidence: { width: 145, gap: 3 },
  photo: { width: 145, height: 105, borderRadius: 10, backgroundColor: colors.slate[100] },
  photoMeta: { fontSize: 10, lineHeight: 14, color: colors.slate[600] },
  findings: { marginTop: 6, gap: 8 },
  finding: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], gap: 5 },
  severity: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", color: colors.slate[600] },
  defect: { fontSize: 12, lineHeight: 18, color: colors.status.danger },
  action: { fontSize: 12, fontWeight: "700", color: colors.brand.dark },
});
