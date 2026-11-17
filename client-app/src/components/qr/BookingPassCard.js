import React from "react";
import { View, Share, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Text } from "../AppText";
import { Button, ui, GREEN } from "../FacilityUI";
export default function BookingPassCard({ pass }) {
  if (!pass) return <View style={ui.card}><Text style={ui.muted}>Your booking pass is not available yet.</Text></View>;
  return <View style={s.card}>
    <View style={s.header}><View style={{ flex: 1 }}><Text style={s.eyebrow}>LATEST CONFIRMED BOOKING</Text><Text style={s.title}>Your facility QR pass</Text></View><Text style={s.status}>{pass.status}</Text></View>
    <View style={s.body}><Text style={s.facility}>{pass.facilityName}</Text><Text style={ui.muted}>{pass.sport} | {pass.date}</Text><Text style={ui.muted}>{pass.session}</Text>
      {pass.qrPayload ? <View style={s.qr}><QRCode value={pass.qrPayload} size={190} color="#0B3D2E" backgroundColor="white" /></View> : <View style={s.expired}><Text style={ui.muted}>This session has ended. Book another slot for a new QR pass.</Text></View>}
      <Text selectable style={s.reference}>{pass.passId}</Text><Text style={s.name}>{pass.userName}</Text><Text style={ui.muted}>Valid until {pass.validTill}</Text><Text style={[ui.muted, { textAlign: "center", marginVertical: 10 }]}>{pass.status === "Upcoming" ? "Keep this pass for your booked session." : "Present this booking pass at the facility reception."}</Text>
      <Button secondary onPress={() => Share.share({ message: `${pass.facilityName}\nBooking: ${pass.passId}\n${pass.sport} | ${pass.date} | ${pass.session}\nBeneficiary: ${pass.userName}` }).catch(() => {})}>Share booking details</Button>
    </View>
  </View>;
}
const s = StyleSheet.create({ card: { width: "100%", borderWidth: 1, borderColor: "#DCE9E0", borderRadius: 20, overflow: "hidden", backgroundColor: "white" }, header: { backgroundColor: "#0B3D2E", padding: 16, flexDirection: "row", gap: 10, alignItems: "center" }, eyebrow: { color: "#A9D9BE", fontSize: 8, fontWeight: "700", letterSpacing: 1 }, title: { color: "white", fontSize: 15, fontWeight: "800", marginTop: 5 }, status: { backgroundColor: "#D5F5DF", color: GREEN, padding: 7, borderRadius: 8, fontSize: 9, fontWeight: "700" }, body: { padding: 19, alignItems: "center", gap: 6 }, facility: { fontSize: 17, fontWeight: "800", color: "#193D28", textAlign: "center" }, qr: { padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "#E1EAE4", marginVertical: 12 }, reference: { color: GREEN, fontSize: 12, fontWeight: "700" }, name: { color: "#365440", fontSize: 12, fontWeight: "600" }, expired: { paddingVertical: 20 } });
