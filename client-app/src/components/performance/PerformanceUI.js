import React from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Text, TextInput } from "../AppText";
export const performanceStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f1f5f9"
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16
  },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0B3D2E"
  },
  score: {
    fontSize: 30,
    fontWeight: "800",
    color: "#047857"
  },
  muted: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 19
  },
  body: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    color: "#0f172a",
    minHeight: 46
  },
  button: {
    backgroundColor: "#047857",
    padding: 13,
    borderRadius: 12,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700"
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 21
  },
  notice: {
    backgroundColor: "#ecfdf5",
    padding: 14,
    borderRadius: 12,
    color: "#065f46"
  },
  track: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden"
  },
  fill: {
    height: 8,
    backgroundColor: "#059669"
  }
});
export function Action({
  children,
  onPress,
  disabled = false,
  secondary = false
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{
    disabled
  }} disabled={disabled} onPress={onPress} style={[performanceStyles.button, secondary && {
    backgroundColor: "#e2e8f0"
  }, disabled && {
    opacity: 0.45
  }]}><Text style={[performanceStyles.buttonText, secondary && {
      color: "#334155"
    }]}>{children}</Text></TouchableOpacity>;
}
export function Field({
  label,
  children,
  ...props
}) {
  return <View style={{
    gap: 7
  }}><Text style={performanceStyles.label}>{label}</Text>{children || <TextInput accessibilityLabel={label} placeholderTextColor="#94a3b8" style={performanceStyles.input} {...props} />}</View>;
}
export function ResourceState({
  loading,
  error,
  onRetry,
  empty,
  emptyText
}) {
  return <>{loading && <ActivityIndicator color="#047857" />}{!!error && <View style={performanceStyles.card}><Text accessibilityRole="alert" style={performanceStyles.error}>{error}</Text><Action secondary onPress={onRetry}>Retry</Action></View>}{!loading && !error && empty && <Text style={performanceStyles.muted}>{emptyText}</Text>}</>;
}
export function EvaluationCard({
  evaluation
}) {
  const s = performanceStyles;
  return <View style={s.card}><Text style={s.title}>{evaluation.sport?.SportName || "Sport"}</Text><Text style={s.score}>{Number(evaluation.totalScore).toFixed(2)} / 100</Text><Text style={s.label}>{evaluation.recognition?.label || "Evaluated"}</Text><Text style={s.muted}>Coach {evaluation.coach?.Name || "Not specified"} | {new Date(evaluation.evaluationDate).toLocaleDateString()} | Template v{evaluation.templateVersion}</Text>{(evaluation.details || []).map(detail => <View key={String(detail.parameterId)} style={{
      gap: 6
    }}><Text style={s.label}>{detail.parameterName}</Text><Text style={s.muted}>Recorded value: {detail.actualValue} | {Number(detail.normalizedScore).toFixed(2)} / 100 | Weighted: {Number(detail.weightedScore).toFixed(2)}</Text><View accessible accessibilityLabel={`${detail.parameterName}: ${detail.normalizedScore} out of 100`} style={s.track}><View style={[s.fill, {
          width: `${Math.max(0, Math.min(100, Number(detail.normalizedScore) || 0))}%`
        }]} /></View>{!!detail.remarks && <Text style={s.body}>{detail.remarks}</Text>}</View>)}{!!evaluation.remarks && <Text style={s.body}>{evaluation.remarks}</Text>}</View>;
}
