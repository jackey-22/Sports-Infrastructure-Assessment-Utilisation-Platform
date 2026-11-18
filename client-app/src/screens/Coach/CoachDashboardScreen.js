import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useMemo, useState } from "react";
import { View, RefreshControl } from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { Action, ResourceState, performanceStyles as s } from "../../components/performance/PerformanceUI";
import usePerformanceResource from "../../hooks/usePerformanceResource";
import { performanceService } from "../../services/performanceService";
export default function CoachDashboardScreen({
  user,
  onLogout,
  onRateAthlete
}) {
  const {
    data,
    loading,
    error,
    reload
  } = usePerformanceResource(performanceService.coachRoster);
  const [search, setSearch] = useState("");
  const athletes = data?.athletes || [];
  const filtered = useMemo(() => athletes.filter(row => `${row.name} ${row.email || ""} ${row.phone || ""} ${(row.sports || []).map(sport => sport.name).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())), [athletes, search]);
  const evaluated = athletes.filter(row => row.latestEvaluation).length;
  return <View style={s.root}><AppScreenScroll keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />} header={<AppHeader title="Coach Dashboard" subtitle={user?.Name || "Athlete performance evaluations"} onLogout={onLogout} />}>
    <View style={s.card}><Text style={s.title}>Athlete performance</Text><Text style={s.body}>Evaluate athletes using published sport parameters. Scores are calculated out of 100.</Text><View style={s.row}><Text style={s.label}>{athletes.length} athletes</Text><Text style={s.label}>{athletes.filter(row => row.canRate).length} eligible</Text><Text style={s.label}>{evaluated} evaluated</Text></View><Text style={s.muted}>Evaluations complete: {athletes.length ? Math.round(evaluated / athletes.length * 100) : 0}%</Text></View>
    <TextInput accessibilityLabel="Search athletes" placeholder="Search name, email, phone or sport" value={search} onChangeText={setSearch} style={s.input} />
    <ResourceState loading={loading} error={error} onRetry={reload} empty={!filtered.length} emptyText="No athletes match this roster or search." />
    {filtered.map(row => <View key={row.id} style={s.card}><Text style={s.title}>{row.name}</Text><Text style={s.muted}>{[row.email, row.phone].filter(Boolean).join(" | ") || "Contact details unavailable"}</Text><Text style={s.body}>{(row.sports || []).map(sport => sport.name).join(", ") || "No booked sport"}</Text><Text style={s.muted}>{row.confirmedBookings || 0} confirmed / {row.bookings || 0} bookings</Text><Text style={s.score}>{row.latestEvaluation ? `${Number(row.latestEvaluation.totalScore).toFixed(2)} / 100` : "Not evaluated"}</Text>{row.latestEvaluation && <Text style={s.muted}>Last evaluation: {new Date(row.latestEvaluation.evaluationDate).toLocaleDateString()}</Text>}<Action disabled={!row.canRate} onPress={() => onRateAthlete?.(row)}>{row.latestEvaluation ? "Evaluate again" : "Evaluate athlete"}</Action>{!row.canRate && <Text style={s.muted}>{row.evaluationUnavailableReason || (row.athleteId ? "Evaluation is available after booking confirmation and payment." : "An athlete profile must be linked before evaluation.")}</Text>}</View>)}
  </AppScreenScroll></View>;
}
