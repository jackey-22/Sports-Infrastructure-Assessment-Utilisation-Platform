import { Text, TextInput } from "../../components/AppText";
import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { register, forgotPassword, resetPassword } from "../../services/authService";
import { colors } from "../../theme/colors";

export default function AccountScreen({ mode, onBack }) {
  const registration = mode === "register";
  const [values, setValues] = useState({ Name: "", Email: "", ContactNum: "", Password: "", confirm: "", code: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { if (!busy) onBack(); return true; });
    return () => subscription.remove();
  }, [busy, onBack]);
  const submit = async (resend = false) => {
    if (busy) return;
    setError(""); setMessage("");
    const email = values.Email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (registration && (!values.Name.trim() || !/^\d{10}$/.test(values.ContactNum.trim()))) return setError("Enter your name and a 10-digit mobile number.");
    if ((registration || sent) && !resend) {
      if (values.Password.length < 8) return setError("Use a password with at least 8 characters.");
      if (values.Password !== values.confirm) return setError("Passwords do not match.");
      if (!registration && !/^\d{8}$/.test(values.code.trim())) return setError("Enter the 8-digit code from your email.");
    }
    setBusy(true);
    try {
      if (registration) {
        await register({ Name: values.Name.trim(), Email: email, ContactNum: values.ContactNum.trim(), Password: values.Password });
        setMessage("Account created. You can now sign in."); setDone(true);
      } else if (!sent || resend) {
        const result = await forgotPassword(email); setSent(true); setMessage(result.msg);
      } else {
        const result = await resetPassword(email, values.code, values.Password); setMessage(result.msg); setDone(true);
      }
      if (registration || (sent && !resend)) setValues(v => ({ ...v, Password: "", confirm: "", code: "" }));
    } catch (err) { setError(err.message || "Please try again."); }
    finally { setBusy(false); }
  };
  const field = (key, label, options = {}) => <View style={styles.group} key={key}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={styles.input} value={values[key]} onChangeText={text => setValues(v => ({ ...v, [key]: text }))} editable={!busy && !(sent && key === "Email")} autoCapitalize="none" autoCorrect={false} {...options} />
  </View>;
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity disabled={busy} onPress={onBack} accessibilityRole="button"><Text style={styles.link}>Back to sign in</Text></TouchableOpacity>
      <Text style={styles.brand}>KhelGujarat</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{registration ? "Create your account" : "Reset your password"}</Text>
        <Text style={styles.intro}>{registration ? "Register as an athlete or citizen to access sports services." : "Receive a reset code at your registered email address."}</Text>
        {!done && <>
          {registration && field("Name", "Full name", { autoCapitalize: "words", textContentType: "name" })}
          {field("Email", "Email address", { keyboardType: "email-address", textContentType: "emailAddress" })}
          {registration && field("ContactNum", "Mobile number", { keyboardType: "phone-pad", maxLength: 10 })}
          {!registration && sent && field("code", "8-digit reset code", { keyboardType: "number-pad", maxLength: 8, textContentType: "oneTimeCode" })}
          {(registration || sent) && <>{field("Password", "New password (at least 8 characters)", { secureTextEntry: true, textContentType: "newPassword" })}{field("confirm", "Confirm password", { secureTextEntry: true, textContentType: "newPassword" })}</>}
        </>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
        <TouchableOpacity accessibilityRole="button" style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={done ? onBack : () => submit()}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{done ? "Return to sign in" : registration ? "Create account" : sent ? "Reset password" : "Send reset code"}</Text>}
        </TouchableOpacity>
        {!registration && sent && !done && <TouchableOpacity disabled={busy} onPress={() => submit(true)}><Text style={styles.link}>Resend code</Text></TouchableOpacity>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate[50] }, content: { padding: 22, paddingBottom: 40 },
  brand: { fontSize: 28, fontWeight: "800", color: colors.gov.primary, marginVertical: 26 },
  card: { backgroundColor: "white", padding: 22, borderRadius: 20, borderWidth: 1, borderColor: colors.slate[200] },
  title: { fontSize: 24, fontWeight: "800", color: colors.slate[800] }, intro: { color: colors.slate[500], lineHeight: 21, marginVertical: 14 },
  group: { marginBottom: 16 }, label: { color: colors.slate[700], marginBottom: 7, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: 12, padding: 13, color: colors.slate[900], backgroundColor: colors.slate[50] },
  button: { backgroundColor: colors.gov.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  buttonText: { color: "white", fontWeight: "700" }, link: { color: colors.gov.primary, fontWeight: "700", paddingVertical: 16 },
  error: { color: "#b91c1c", marginVertical: 8 }, message: { color: colors.gov.primary, marginVertical: 8, lineHeight: 21 },
});
