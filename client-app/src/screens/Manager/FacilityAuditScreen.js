import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "../../components/common/AppHeader";
import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text } from "../../components/AppText";
import { managerService } from "../../services/manager/managerService";
import { colors } from "../../theme/colors";
import { formatDate } from "../../utils/manager/managerUtils";

const MAX_PHOTOS = 6;

function Action({ label, onPress, disabled, primary, destructive }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, primary && styles.primary, destructive && styles.destructive, disabled && styles.disabled]}
    >
      <Text style={[styles.actionLabel, primary && styles.primaryLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function assessmentScore(assessment) {
  return assessment.ai?.status === "completed"
    ? assessment.ai.visualConditionIndex
    : assessment.score;
}

function AssessmentReport({ assessment, saved = false }) {
  const analysed = assessment.ai?.status === "completed";
  const score = assessmentScore(assessment);
  const summary = analysed ? assessment.ai.overallSummary : assessment.summary;

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>
        {assessment.sportName ? `${assessment.sportName} assessment` : "Facility assessment"}
      </Text>
      {saved && !!assessment.date && <Text style={styles.body}>{formatDate(assessment.date)}</Text>}
      <View style={styles.scorePanel}>
        <Text style={styles.scoreLabel}>{analysed ? "Visual condition score" : "Recorded score"}</Text>
        {score == null ? (
          <Text style={styles.scoreUnavailable}>Not scored</Text>
        ) : (
          <Text style={styles.score}>{score}<Text style={styles.scoreLabel}> / 100</Text></Text>
        )}
      </View>
      <Text accessibilityRole="header" style={styles.heading}>Summary</Text>
      <Text style={styles.body}>{summary || "No summary recorded."}</Text>
    </View>
  );
}

export function FacilityAuditScreen({ onBack }) {
  const [facility, setFacility] = useState(null);
  const [pending, setPending] = useState([]);
  const [sportId, setSportId] = useState("");
  const [photos, setPhotos] = useState([]);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRequest, setHistoryRequest] = useState({});
  const [savedRecord, setSavedRecord] = useState(null);

  useEffect(() => {
    let active = true;
    setBusy("Loading assessments");
    setError("");
    Promise.all([
      managerService.getAssignedFacility(),
      managerService.listPendingAssessments(),
    ]).then(([assigned, drafts]) => {
      if (active) {
        setFacility(assigned);
        setPending(drafts);
      }
    }).catch((failure) => {
      if (active) setError(failure.message);
    }).finally(() => {
      if (active) setBusy("");
    });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (showForm) return;
    let active = true;
    const { before } = historyRequest;
    setHistoryLoading(true);
    setHistoryError("");
    managerService.listAssessments(before).then((page) => {
      if (active) {
        setHistory((current) => before ? {
          ...page,
          assessments: [...current.assessments, ...page.assessments],
        } : page);
      }
    }).catch((failure) => {
      if (active) setHistoryError(failure.message);
    }).finally(() => {
      if (active) setHistoryLoading(false);
    });
    return () => { active = false; };
  }, [showForm, historyRequest]);

  function returnToRecords() {
    setReview(null);
    setConfirmDiscard(false);
    setError("");
    setHistoryRequest({});
    setShowForm(false);
  }

  function openAssessment(draft = null) {
    setSportId("");
    setPhotos([]);
    setReview(draft);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  async function addPhotos(camera) {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    setError("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Allow camera access to take an assessment photo.");
          return;
        }
      }
      const options = { mediaTypes: ["images"], quality: 0.7 };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({
            ...options,
            allowsMultipleSelection: remaining > 1,
            selectionLimit: remaining,
          });
      if (result.canceled || !result.assets?.length) return;
      const selected = result.assets.filter((photo) => {
        const mime = photo.file?.type || photo.mimeType;
        return !mime || ["image/jpeg", "image/png", "image/webp"].includes(mime);
      });
      if (selected.length < result.assets.length) {
        setError("Only JPEG, PNG and WebP photos were added.");
      } else if (selected.length > remaining) {
        setError(`Only ${MAX_PHOTOS} photos can be added per assessment.`);
      }
      setPhotos((current) => [...current, ...selected].slice(0, MAX_PHOTOS));
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function analyse() {
    setBusy("Analysing with Gemini");
    setError("");
    setNotice("");
    try {
      const assessment = await managerService.analyseSportPhotos(sportId, photos);
      setPending((current) => [assessment, ...current]);
      setReview(assessment);
      setPhotos([]);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("Saving assessment");
    setError("");
    try {
      await managerService.saveAssessment(review.id);
      setPending((current) => current.filter(({ id }) => id !== review.id));
      setNotice(`${review.sportName} assessment saved.`);
      returnToRecords();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  async function discard() {
    setBusy("Discarding assessment");
    setError("");
    try {
      await managerService.discardAssessment(review.id);
      setPending((current) => current.filter(({ id }) => id !== review.id));
      setNotice("Assessment discarded.");
      returnToRecords();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  function goBack() {
    if (savedRecord) setSavedRecord(null);
    else if (showForm) returnToRecords();
    else onBack?.();
  }

  function refreshAssessments() {
    if (historyLoading || busy) return;
    setReload((current) => current + 1);
    setHistoryRequest({});
  }

  const findings = review?.ai;
  const sports = facility?.sports || [];
  const showingRecords = !showForm && !savedRecord;

  return (
    <AppScreenScroll
      contentContainerStyle={styles.content}
      refreshControl={showingRecords ? (
        <RefreshControl
          refreshing={!!history && !historyRequest.before && (historyLoading || !!busy)}
          onRefresh={refreshAssessments}
          tintColor={colors.gov.primary}
          colors={[colors.gov.primary]}
        />
      ) : undefined}
      header={<AppHeader
        title={savedRecord ? "Assessment record" : showForm ? "New assessment" : "Condition Assessment"}
        subtitle={facility?.name || "Sport assessments"}
        onBack={goBack}
        actions={showingRecords ? [{
          label: "Refresh assessments",
          icon: "refresh-outline",
          onPress: refreshAssessments,
          disabled: historyLoading || !!busy,
        }] : []}
      />}
    >
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!savedRecord && !!notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
      {showForm && !!busy && (
        <View style={styles.row}>
          <ActivityIndicator color={colors.gov.primary} />
          <Text style={styles.body}>{busy}</Text>
        </View>
      )}

      {!showForm ? (
        savedRecord ? (
          <AssessmentReport assessment={savedRecord} saved />
        ) : (
          <>
            <Action label="New assessment" onPress={() => openAssessment()} primary />
            {!!pending.length && (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.heading}>Pending reviews</Text>
                {pending.map((assessment) => (
                  <Action
                    key={assessment.id}
                    label={`Review ${assessment.sportName}${assessment.date ? ` · ${formatDate(assessment.date)}` : ""}`}
                    onPress={() => openAssessment(assessment)}
                  />
                ))}
              </View>
            )}
            <Text accessibilityRole="header" style={styles.heading}>Saved assessments</Text>
            {history?.assessments.map((assessment) => {
              const score = assessmentScore(assessment);
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={assessment.id}
                  style={styles.card}
                  onPress={() => setSavedRecord(assessment)}
                >
                  <Text style={styles.heading}>{assessment.sportName || "Facility assessment"}</Text>
                  <View style={styles.recordDetails}>
                    <Text style={styles.body}>{assessment.date ? formatDate(assessment.date) : "Date unavailable"}</Text>
                    <Text style={styles.scoreLabel}>{score == null ? "Not scored" : `${score} / 100`}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {history && history.assessments.length === 0 && (
              <Text style={styles.body}>No saved assessments yet.</Text>
            )}
            {historyLoading ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.gov.primary} />
                <Text style={styles.body}>Loading assessment history</Text>
              </View>
            ) : historyError ? (
              <View style={styles.card}>
                <Text accessibilityRole="alert" style={styles.error}>{historyError}</Text>
                <Action label="Retry" onPress={() => setHistoryRequest({ ...historyRequest })} />
              </View>
            ) : history?.nextCursor && (
              <Action
                label="Load older assessments"
                onPress={() => setHistoryRequest({ before: history.nextCursor })}
              />
            )}
          </>
        )
      ) : review && findings ? (
        <>
          <AssessmentReport assessment={review} />
          {confirmDiscard ? (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.heading}>Discard this assessment?</Text>
              <Text style={styles.body}>This will permanently remove the pending review.</Text>
              <Action label="Confirm discard" onPress={discard} disabled={!!busy} destructive />
              <Action label="Cancel" onPress={() => { setConfirmDiscard(false); setError(""); }} disabled={!!busy} />
            </View>
          ) : (
            <>
              <Action label="Save assessment" onPress={save} disabled={!!busy} primary />
              <Action label="Discard assessment" onPress={() => { setConfirmDiscard(true); setError(""); }} disabled={!!busy} destructive />
              <Action label="Back to sport selection" onPress={() => { setReview(null); setError(""); }} disabled={!!busy} />
            </>
          )}
        </>
      ) : facility ? (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>Select a sport</Text>
            {sports.length ? (
              <Picker
                accessibilityLabel="Sport"
                selectedValue={sportId}
                enabled={!busy}
                onValueChange={(id) => {
                  if (id === sportId) return;
                  setSportId(id);
                  setPhotos([]);
                  setError("");
                }}
              >
                <Picker.Item label="Choose a sport" value="" />
                {sports.map((sport) => <Picker.Item key={sport.id} label={sport.name} value={sport.id} />)}
              </Picker>
            ) : <Text style={styles.body}>No sports are listed for this facility.</Text>}
          </View>

          {!!sportId && (
            <View style={styles.card}>
              <Text style={styles.heading}>Sport photos</Text>
              <Text style={styles.body}>Add up to {MAX_PHOTOS} photos of the selected sport's playing area and equipment. Analysis sends the photos to Gemini.</Text>
              <View style={styles.row}>
                <Action label="Use camera" onPress={() => addPhotos(true)} disabled={!!busy || photos.length >= MAX_PHOTOS} />
                <Action label="Choose photos" onPress={() => addPhotos(false)} disabled={!!busy || photos.length >= MAX_PHOTOS} />
              </View>
              {!!photos.length && (
                <View style={styles.row}>
                  {photos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`}>
                      <Image source={{ uri: photo.uri }} style={styles.photo} accessibilityLabel={`Sport photo ${index + 1}`} />
                      <Action label={`Remove ${index + 1}`} disabled={!!busy} onPress={() => setPhotos(photos.filter((_, i) => i !== index))} />
                    </View>
                  ))}
                </View>
              )}
              <Action label="Analyse photos" onPress={analyse} disabled={!!busy || !photos.length} primary />
            </View>
          )}

        </>
      ) : !busy && <Action label="Retry" onPress={() => setReload(reload + 1)} />}
    </AppScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.surface.card, gap: 8 },
  heading: { fontSize: 16, fontWeight: "800", color: colors.brand.dark },
  body: { fontSize: 13, lineHeight: 20, color: colors.slate[700] },
  scorePanel: { borderRadius: 12, padding: 16, backgroundColor: colors.brand.soft, gap: 4 },
  scoreLabel: { fontSize: 13, fontWeight: "700", color: colors.brand.dark },
  score: { fontSize: 42, fontWeight: "800", color: colors.brand.dark },
  scoreUnavailable: { fontSize: 20, fontWeight: "800", color: colors.brand.dark },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  recordDetails: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  action: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, alignItems: "center", backgroundColor: colors.brand.soft },
  actionLabel: { fontSize: 13, fontWeight: "700", color: colors.brand.dark },
  primary: { backgroundColor: colors.gov.primary },
  primaryLabel: { color: colors.text.inverse },
  destructive: { backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.status.danger },
  disabled: { opacity: 0.5 },
  error: { color: colors.status.danger, fontWeight: "700" },
  success: { color: colors.brand.dark, fontWeight: "700" },
  photo: { width: 94, height: 72, borderRadius: 8, marginBottom: 4 },
});

export default FacilityAuditScreen;
