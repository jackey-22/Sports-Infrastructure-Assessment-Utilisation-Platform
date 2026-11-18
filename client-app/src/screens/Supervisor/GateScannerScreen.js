import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text, TextInput } from "../../components/AppText";
import { Button, ui, GREEN } from "../../components/FacilityUI";
import { QrScannerModal } from "../../components/qr/QrScannerModal";
import { api } from "../../api/client";
export default function GateScannerScreen({
  user,
  onLogout,
  onBack
}) {
  const [camera, setCamera] = useState(false),
    [raw, setRaw] = useState(""),
    [pass, setPass] = useState(null),
    [rows, setRows] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const token = useRef(""),
    lock = useRef(false);
  const load = async () => {
    try {
      const result = await api.get("/api/gate/attendance");
      setRows(result.data || []);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const scan = async value => {
    if (lock.current) return;
    setCamera(false);
    setPass(null);
    setError("");
    setMessage("");
    try {
      const payload = JSON.parse(value);
      if (payload.type !== "KHELGUJARAT_BOOKING_PASS" || typeof payload.token !== "string") throw new Error("Scan a KhelGujarat booking QR pass");
      lock.current = true;
      setBusy(true);
      const result = await api.post("/api/booking-passes/verify", {
        token: payload.token
      });
      token.current = payload.token;
      setPass(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const record = async action => {
    if (lock.current || !pass) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/api/gate/attendance", {
        token: token.current,
        action
      });
      setMessage(`${result.msg}: ${pass.userName}`);
      setPass(null);
      setRaw("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return <View style={ui.safe}><View style={ui.screen}><AppScreenScroll contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled" header={<AppHeader title="Facility gate desk" subtitle={user?.Name || "QR entry & attendance"} onBack={onBack} onLogout={onLogout} />}>{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}{!!message && <Text style={{
          color: GREEN,
          fontWeight: "700"
        }}>{message}</Text>}<View style={[ui.card, {
          gap: 14
        }]}><Text style={ui.sectionTitle}>Scan a booking QR pass</Text><Text style={ui.muted}>Verify a paid booking and record entry or exit for this facility.</Text><Button disabled={busy} onPress={() => setCamera(true)}>Open camera scanner</Button><TextInput accessibilityLabel="QR scanner content" style={ui.input} multiline placeholder="USB scanner / pasted QR content" value={raw} onChangeText={setRaw} /><Button secondary disabled={busy || !raw.trim()} onPress={() => scan(raw)}>{busy ? "Checking..." : "Verify pass"}</Button></View>{pass && <View style={[ui.card, {
          gap: 12,
          backgroundColor: "#E8F5EE"
        }]}><Text style={ui.sectionTitle}>{pass.userName}</Text><Text style={ui.sectionTitle}>{pass.facilityName}</Text><Text style={ui.muted}>{pass.sport} | {pass.date} | {pass.session}</Text><Text style={ui.muted}>{pass.passId} | {pass.status}</Text><Button disabled={busy || pass.status !== "Active"} onPress={() => record("entry")}>Record entry</Button><Button secondary disabled={busy || pass.status !== "Active"} onPress={() => record("exit")}>Record exit</Button></View>}<View style={[ui.card, {
          gap: 12
        }]}><Text style={ui.sectionTitle}>Today's attendance</Text><Button secondary onPress={load}>Refresh</Button>{!rows.length ? <Text style={ui.muted}>No entries recorded today.</Text> : rows.map(row => <View key={row.id} style={{
            borderTopWidth: 1,
            borderTopColor: "#E4ECE6",
            paddingTop: 12,
            gap: 5
          }}><Text style={{
              fontWeight: "700",
              color: "#254B34"
            }}>{row.name}</Text><Text style={ui.muted}>{row.sport} | {row.reference}</Text><Text style={{
              fontSize: 11,
              color: GREEN,
              fontWeight: "700"
            }}>{row.status}</Text><Text style={ui.muted}>In: {new Date(row.entry).toLocaleTimeString()}{row.exit ? ` | Out: ${new Date(row.exit).toLocaleTimeString()}` : ""}</Text></View>)}</View></AppScreenScroll><QrScannerModal visible={camera} onClose={() => setCamera(false)} onScan={scan} title="Scan facility booking pass" /></View></View>;
}
