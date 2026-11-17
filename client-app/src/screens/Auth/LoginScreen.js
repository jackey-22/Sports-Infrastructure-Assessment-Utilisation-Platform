import { Text, TextInput } from "../../components/AppText";
import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { login } from "../../services/authService";
import ipconfig from "../../../ipconfig";
import AccountScreen from "./AccountScreen";
import Svg, { Path, Ellipse, G, Rect } from "react-native-svg";

// Demo accounts matching client-web/src/Components/Auth/demoAuth.js
const DEMO_PROFILES = [
  {
    role: 2,
    name: "Nirav Joshi",
    title: "Badminton Coach",
    badge: "COACH",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    email: "coach.khokhra@sag.gujarat.gov.in",
    password: "coach",
    district: "Khokhra Sports Complex",
  },
  {
    role: 0,
    name: "Aarav Trivedi",
    title: "Athlete / Citizen",
    badge: "ATHLETE · CITIZEN",
    badgeBg: "#e8f5ee",
    badgeColor: "#007D40",
    email: "athlete.aarav@gmail.com",
    password: "athlete",
    district: "Ahmedabad",
  },
];

export const LoginScreen = ({ onLoginSuccess, onExplorePublic }) => {
  const [showDemos, setShowDemos] = useState(false);
  const [accountPage, setAccountPage] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Quick Demo Login (Instant switch for reviews and evaluations)
  const handleQuickDemoLogin = async (profile) => {
    setLoading(true);
    const mockUser = {
      _id: `demo_${profile.role}_${Date.now()}`,
      Name: profile.name,
      Email: profile.email,
      Role: profile.role,
      District: profile.district,
    };

    try {
      await AsyncStorage.setItem("token", `demo_jwt_token_role_${profile.role}`);
      await AsyncStorage.setItem("userData", JSON.stringify(mockUser));
      if (onLoginSuccess) {
        onLoginSuccess(mockUser);
      }
    } catch (e) {
      Alert.alert("Error", "Could not set demo session.");
    } finally {
      setLoading(false);
    }
  };

  // Live Backend Authentication
  const handleLiveLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      Alert.alert("Input Required", "Please enter both Email and Password.");
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      Alert.alert(
        err?.status === 401 ? "Login Failed" : "Connection Error",
        err?.message || `Could not reach server at ${ipconfig.ip}:9999.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (accountPage) return <AccountScreen mode={accountPage} onBack={() => setAccountPage(null)} />;

  const actionRow = (icon, title, subtitle, onPress, blue = false) => (
    <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={onPress} activeOpacity={0.75} style={[styles.actionRow, blue && styles.blueRow]}>
      <Ionicons name={icon} size={28} color={blue ? "#17617A" : colors.gov.primary} />
      <View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={blue ? "#17617A" : colors.brand.dark} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <Image source={require("../../../assets/Logo.png")} style={styles.logo} resizeMode="contain" accessible accessibilityLabel="Sports Authority of Gujarat logo" />
              <View style={styles.heroCopy}>
                <Text style={styles.govTitle}>GOVERNMENT OF GUJARAT</Text>
                <Text style={styles.heroEyebrow}>Sports Authority of Gujarat (SAG)</Text>
              </View>
            </View>
            <View style={styles.securePill}><Ionicons name="shield-checkmark-outline" size={12} color="#D1FAE5" /><Text style={styles.secureText}>SECURE ACCOUNT ACCESS</Text></View>
            <Text style={styles.appTitle}>{"Welcome to\nKhelGujarat"}</Text>
            <Text style={styles.tagline}>One portal for sports facilities,{'\n'}training and athlete services.</Text>
            <View pointerEvents="none" accessible={false} style={styles.art}>
              <Svg width="190" height="150" viewBox="0 0 190 150">
                <G stroke="#79D5A6" strokeWidth="2" fill="none" opacity={0.45}>
                  <Ellipse cx="115" cy="70" rx="68" ry="20" />
                  <Ellipse cx="115" cy="70" rx="59" ry="13" />
                  <Path d="M47 70 L54 112 Q115 133 177 111 L183 70 M54 112 Q115 92 177 111 M65 80 L68 107 M88 86 L89 103 M115 89 L115 102 M141 86 L140 103 M164 80 L162 107 M40 72 L37 20 M170 54 L173 8" />
                  <Rect x="30" y="12" width="14" height="13" rx="1" /><Rect x="166" y="1" width="14" height="13" rx="1" />
                  <Path d="M34 12 L34 25 M39 12 L39 25 M30 18 L44 18 M170 1 L170 14 M175 1 L175 14 M166 7 L180 7" />
                </G>
                <Path d="M0 149 Q90 98 190 118 L190 150Z" fill="#35B779" opacity={0.25} />
              </Svg>
            </View>
            <View pointerEvents="none" style={styles.wave} />
          </View>

          <View style={styles.body}>
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.accountIcon}><Ionicons name="people-outline" size={25} color={colors.gov.primary} /></View>
                <View style={styles.headingCopy}><Text style={styles.cardEyebrow}>Account access</Text><Text style={styles.cardHeader}>Sign in to continue</Text></View>
              </View>
              <Text style={styles.cardIntro}>Use your registered email and password to access your dashboard.</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#687C74" />
                  <TextInput accessibilityLabel="Email address" style={styles.input} placeholder="Enter your registered email" placeholderTextColor="#8A9892" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" editable={!loading} />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#687C74" />
                  <TextInput accessibilityLabel="Password" style={styles.input} placeholder="Enter your password" placeholderTextColor="#8A9892" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textContentType="password" autoCapitalize="none" autoCorrect={false} editable={!loading} returnKeyType="go" onSubmitEditing={handleLiveLogin} />
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#687C74" /></TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity accessibilityRole="button" style={[styles.submitBtn, loading && styles.disabled]} onPress={handleLiveLogin} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.submitBtnText}>Sign in</Text><Ionicons name="arrow-forward" size={21} color="#fff" /></>}
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => setAccountPage("forgot")} style={styles.forgot}><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or get started</Text><View style={styles.dividerLine} /></View>
              {actionRow("person-add-outline", "New athlete / citizen?", "Create an account and get started", () => setAccountPage("register"))}
              {onExplorePublic && actionRow("compass-outline", "Explore Gujarat facilities", "Browse sports venues as a public visitor", onExplorePublic, true)}
            </View>
            {onExplorePublic && <View style={styles.quickCard}>
              <View style={styles.quickHeading}><Ionicons name="flash-outline" size={19} color={colors.gov.primary} /><Text style={styles.quickTitle}>Quick actions</Text></View>
              <View style={styles.quickGrid}>
                {[{ icon: "location-outline", title: "Find facilities" }, { icon: "calendar-outline", title: "Book a slot" }].map((item, index) => <TouchableOpacity accessibilityRole="button" disabled={loading} key={item.title} onPress={onExplorePublic} style={[styles.quickAction, index > 0 && styles.quickBorder]}><Ionicons name={item.icon} size={27} color={colors.gov.primary} /><Text style={styles.quickLabel}>{item.title}</Text></TouchableOpacity>)}
              </View>
            </View>}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showDemos }} disabled={loading} onPress={() => setShowDemos(!showDemos)} style={styles.demoToggle}><Text style={styles.demoToggleText}>Try a demo account</Text><Ionicons name={showDemos ? "chevron-up" : "chevron-down"} size={15} color="#6B8075" /></TouchableOpacity>
            {showDemos && DEMO_PROFILES.map(profile => <TouchableOpacity accessibilityRole="button" key={profile.role} disabled={loading} onPress={() => handleQuickDemoLogin(profile)} style={styles.demoCard}><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{profile.name}</Text><Text style={styles.actionSubtitle}>{profile.title}</Text></View><Ionicons name="arrow-forward" size={20} color={colors.gov.primary} /></TouchableOpacity>)}
            <View style={styles.footer}><Ionicons name="shield-checkmark-outline" size={13} color="#82958B" /><Text style={styles.footerText}>Sports Authority of Gujarat</Text></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#084733" },
  keyboardView: { flex: 1, backgroundColor: "#F5F8F6" },
  scrollContent: { paddingBottom: 24 },
  hero: { backgroundColor: "#084733", paddingHorizontal: 24, paddingTop: Platform.OS === "android" ? 24 : 16, paddingBottom: 54, overflow: "hidden" },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  logo: { width: 49, height: 49 }, heroCopy: { flex: 1 },
  govTitle: { fontSize: 11, lineHeight: 17, fontWeight: "800", color: "#fff", letterSpacing: 0.6 },
  heroEyebrow: { fontSize: 10, lineHeight: 16, color: "#C1DFCF", fontWeight: "500" },
  securePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#235E48", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginTop: 24 },
  secureText: { fontSize: 8, letterSpacing: 1, fontWeight: "700", color: "#D1FAE5" },
  appTitle: { fontSize: 35, lineHeight: 41, letterSpacing: -1.3, color: "#fff", fontWeight: "800", marginTop: 13, zIndex: 1 },
  tagline: { fontSize: 12, lineHeight: 20, color: "#D1E6DA", marginTop: 10, zIndex: 1 },
  art: { position: "absolute", right: -23, bottom: 24 },
  wave: { position: "absolute", width: 420, height: 75, borderRadius: 200, backgroundColor: "#15965F", opacity: 0.19, bottom: -47, left: -60, transform: [{ rotate: "-12deg" }] },
  body: { paddingHorizontal: 18, width: "100%", maxWidth: 540, alignSelf: "center", marginTop: -27 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 21, borderWidth: 1, borderColor: "#E8EEEA", shadowColor: "#123C29", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountIcon: { width: 47, height: 47, borderRadius: 14, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" }, headingCopy: { flex: 1 },
  cardEyebrow: { fontSize: 11, fontWeight: "700", color: colors.gov.primary, marginBottom: 3 },
  cardHeader: { fontSize: 21, fontWeight: "800", letterSpacing: -0.7, color: "#142C21" },
  cardIntro: { fontSize: 12, lineHeight: 20, color: "#718078", marginTop: 13, marginBottom: 23 },
  inputGroup: { marginBottom: 17 }, inputLabel: { fontSize: 12, fontWeight: "700", color: "#243D30", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 4, borderRadius: 13, borderWidth: 1, borderColor: "#E2E9E5", backgroundColor: "#F8FAF9" },
  input: { flex: 1, minWidth: 0, height: 51, paddingHorizontal: 10, fontSize: 12, color: "#193C29" }, eyeBtn: { minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center" },
  submitBtn: { minHeight: 52, paddingVertical: 13, borderRadius: 13, backgroundColor: colors.gov.primary, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 3 },
  disabled: { opacity: 0.6 }, submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  forgot: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 3 }, forgotText: { fontSize: 12, fontWeight: "700", color: colors.gov.primary },
  divider: { flexDirection: "row", gap: 12, alignItems: "center", marginVertical: 12 }, dividerLine: { flex: 1, height: 1, backgroundColor: "#E8EEEA" }, dividerText: { fontSize: 10, color: "#8A9890" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#EFF8F2", borderRadius: 13, padding: 13, marginTop: 10 }, blueRow: { backgroundColor: "#EDF6FA" },
  actionCopy: { flex: 1 }, actionTitle: { fontSize: 12, fontWeight: "700", color: "#193728", lineHeight: 18 }, actionSubtitle: { fontSize: 10, lineHeight: 17, color: "#718078", marginTop: 2 },
  quickCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#E7EEE9", marginTop: 18, overflow: "hidden" },
  quickHeading: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EDF7F0", paddingHorizontal: 16, paddingVertical: 12 }, quickTitle: { fontSize: 13, fontWeight: "700", color: colors.brand.dark },
  quickGrid: { flexDirection: "row", paddingVertical: 17 }, quickAction: { flex: 1, gap: 8, alignItems: "center", paddingHorizontal: 6, paddingVertical: 3 }, quickBorder: { borderLeftWidth: 1, borderLeftColor: "#E7EEE9" }, quickLabel: { fontSize: 11, fontWeight: "600", color: "#254331", textAlign: "center" },
  demoToggle: { flexDirection: "row", alignSelf: "center", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 48, marginTop: 10 }, demoToggleText: { color: "#6B8075", fontSize: 11 },
  demoCard: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 15, marginBottom: 8, borderWidth: 1, borderColor: "#E7EEE9" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }, footerText: { fontSize: 9, color: "#82958B" },
});

export default LoginScreen;
