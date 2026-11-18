import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, RefreshControl } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Text, TextInput } from "../../components/AppText";
import { Action, Field, ResourceState, EvaluationCard, performanceStyles as s } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
import { preferredSport, evaluationPreview, evaluationPayload } from "../../utils/performance";
export default function RateAthleteScreen({
  athlete,
  onBack,
  onSaved
}) {
  const roster = usePerformanceResource(performanceService.coachRoster);
  const [selected, setSelected] = useState(athlete || null),
    [sportId, setSportId] = useState(preferredSport(athlete)),
    [template, setTemplate] = useState(null),
    [scores, setScores] = useState({}),
    [remarks, setRemarks] = useState(""),
    [search, setSearch] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false),
    [templateError, setTemplateError] = useState(""),
    [templateRevision, setTemplateRevision] = useState(0),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(null);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Re-check eligibility against a fresh roster without rewriting entered marks.
  const row = roster.data?.athletes?.find(item => item.id === selected?.id) || (roster.data ? null : selected);
  useEffect(() => {
    let active = true;
    setTemplate(null);
    setScores({});
    setTemplateError("");
    setSaved(null);
    if (!sportId || !selected) {
      setTemplateLoading(false);
      return undefined;
    }
    setTemplateLoading(true);
    performanceService.template(sportId).then(value => {
      if (active) setTemplate(value);
    }).catch(err => {
      if (active) setTemplateError(err.message);
    }).finally(() => {
      if (active) setTemplateLoading(false);
    });
    return () => {
      active = false;
    };
  }, [sportId, selected?.id, templateRevision]);
  const preview = useMemo(() => evaluationPreview(template, scores), [template, scores]);
  const selectAthlete = item => {
    setSelected(item);
    setSportId(preferredSport(item));
    setRemarks("");
    setError("");
    setSaved(null);
  };
  const save = async () => {
    if (lock.current) return;
    setError("");
    let payload;
    try {
      payload = evaluationPayload(row, sportId, template, scores, remarks);
    } catch (err) {
      setError(err.message);
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      const result = await performanceService.evaluate(payload);
      if (mounted.current) {
        setSaved({
          ...result,
          sport: template.sport,
          coach: {
            Name: "You"
          }
        });
        await roster.reload();
        if (mounted.current) onSaved?.();
      }
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const sports = [...new Map([...(row?.sports || []).map(sport => [String(sport.id), {
    id: String(sport.id),
    name: sport.name
  }]), ...(sportId && !(row?.sports || []).some(sport => String(sport.id) === sportId) ? [[sportId, {
    id: sportId,
    name: template?.sport?.SportName || "Booked sport"
  }]] : [])]).values()];
  const visible = (roster.data?.athletes || []).filter(item => `${item.name} ${item.email || ""} ${(item.sports || []).map(sport => sport.name).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <View style={s.root}><AppScreenScroll keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={roster.loading} onRefresh={roster.reload} />} header={<AppHeader title={selected ? "Athlete Evaluation" : "Select Athlete"} subtitle="Published sport parameters | Score out of 100" onBack={saving ? undefined : onBack} />}>
    {!selected ? <><TextInput accessibilityLabel="Search athletes to evaluate" placeholder="Search athlete or sport" value={search} onChangeText={setSearch} style={s.input} /><ResourceState loading={roster.loading} error={roster.error} onRetry={roster.reload} empty={!visible.length} emptyText="No athletes available." />{visible.map(item => <View key={item.id} style={s.card}><Text style={s.title}>{item.name}</Text><Text style={s.muted}>{(item.sports || []).map(sport => sport.name).join(", ")}</Text><Action disabled={!item.canRate} onPress={() => selectAthlete(item)}>Evaluate athlete</Action>{!item.canRate && <Text style={s.muted}>{item.evaluationUnavailableReason || (item.athleteId ? "Requires a confirmed, paid booking." : "Athlete profile unavailable.")}</Text>}</View>)}</> : <>
    <View style={s.card}><Text style={s.title}>{row?.name || selected.name}</Text>{!athlete && <Action secondary disabled={saving} onPress={() => {
            setSelected(null);
            setSportId("");
          }}>Choose another athlete</Action>}<Field label="Sport"><Picker enabled={!saving} selectedValue={sportId} onValueChange={value => {
              setSportId(value);
              setError("");
            }}><Picker.Item label="Select sport" value="" />{sports.map(sport => <Picker.Item key={sport.id} value={sport.id} label={sport.name || "Sport"} />)}</Picker></Field>{!roster.loading && !row?.canRate && <Text style={s.error}>This athlete is no longer eligible for evaluation.</Text>}</View>
    <ResourceState loading={templateLoading} error={templateError} onRetry={() => setTemplateRevision(value => value + 1)} empty={!template && !sportId} emptyText="No sport is associated with this athlete yet." />
    {!!roster.error && <ResourceState error={roster.error} onRetry={roster.reload} />}
    {template && !saved && <><View style={s.card}><Text style={s.title}>{template.sport?.SportName || "Sport"} | Template v{template.version}</Text><Action secondary disabled={saving} onPress={() => setTemplateRevision(value => value + 1)}>Reload template (clears marks)</Action><Text style={s.score}>{preview.total.toFixed(2)} / 100</Text><Text style={s.muted}>Preview | {preview.completed}/{preview.details.length} parameters completed. The server calculates the saved score.</Text></View>
    {template.parameters.filter(parameter => parameter.active).map(parameter => <View key={parameter._id} style={s.card}><Text style={s.title}>{parameter.name}</Text><Text style={s.label}>Weight: {parameter.weightage}%</Text>{!!parameter.description && <Text style={s.body}>{parameter.description}</Text>}{!!parameter.instructions && <Text style={s.body}>{parameter.instructions}</Text>}<Text style={s.muted}>{parameter.evaluationType === "qualitative" ? `Rating: 0 to ${parameter.maxScore}` : `Range: ${parameter.benchmark?.min} to ${parameter.benchmark?.max} | ${parameter.scoringMethod === "lower_is_better" ? "Lower" : "Higher"} is better`}</Text><Field label={`${parameter.name} mark`} value={scores[parameter._id] ?? ""} onChangeText={value => setScores(old => ({
              ...old,
              [parameter._id]: value
            }))} keyboardType="decimal-pad" editable={!saving} /></View>)}
    <View style={s.card}><Field label="Coach observations" value={remarks} onChangeText={setRemarks} multiline editable={!saving} />{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Action disabled={saving || roster.loading || !!roster.error || !row?.canRate || !preview.valid} onPress={save}>{saving ? "Saving evaluation..." : "Submit evaluation"}</Action>{!preview.valid && <Text style={s.muted}>{preview.error}</Text>}</View></>}
    {saved && <><Text style={s.notice}>Evaluation saved successfully.</Text><EvaluationCard evaluation={saved} /><Action onPress={onBack}>Done</Action></>}
    </>}
  </AppScreenScroll></View>;
}
