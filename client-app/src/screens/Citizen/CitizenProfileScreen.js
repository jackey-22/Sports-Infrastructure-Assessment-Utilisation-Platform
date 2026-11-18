import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React from "react";
import { View } from "react-native";
import { Text } from "../../components/AppText";
import { Action, performanceStyles as s } from "../../components/performance/PerformanceUI";
export default function CitizenProfileScreen({
  user,
  onBack,
  onLogout
}) {
  return <View style={s.root}><AppScreenScroll contentContainerStyle={s.content} header={<AppHeader title="Account Profile" subtitle="Your registered account details" onBack={onBack} onLogout={onLogout} />}><View style={s.card}><Text style={s.title}>{user?.Name || "Citizen / Athlete"}</Text>{[["Email", user?.Email], ["Mobile", user?.ContactNum], ["Date of birth", user?.DOB ? new Date(user.DOB).toLocaleDateString() : ""]].map(([label, value]) => <View key={label}><Text style={s.label}>{label}</Text><Text style={s.body}>{value || "Not provided"}</Text></View>)}</View><Action onPress={onBack}>Back to performance</Action></AppScreenScroll></View>;
}
