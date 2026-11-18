import AppScreenScroll from "../../components/common/AppScreenScroll";
import { Text, TextInput } from "../../components/AppText";
import React, { useState, useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { login } from "../../services/authService";
import ipconfig from "../../../ipconfig";
import AccountScreen from "./AccountScreen";
import AppHeader from "../../components/common/AppHeader";

// Coach demo and linked athlete account verified against the configured database.
const DEMO_PROFILES = [{
  role: 2,
  name: "Neha Shah",
  title: "Coach / Instructor",
  badge: "COACH",
  badgeBg: "#f3e8ff",
  badgeColor: "#7e22ce",
  email: "neha.shah@sag.gujarat.gov.in",
  password: "coach",
  district: "Ahmedabad"
}, {
  role: 0,
  name: "Patel Dhruv Vasantkumar",
  title: "Linked athlete - enter your password",
  badge: "ATHLETE · CITIZEN",
  badgeBg: "#e8f5ee",
  badgeColor: "#007D40",
  email: "dhruv@gmail.com",
  district: "Ahmedabad"
}];
export const LoginScreen = ({
  onLoginSuccess,
  onExplorePublic
}) => {
  const [showDemos, setShowDemos] = useState(false);
  const [accountPage, setAccountPage] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loginLock = useRef(false);
  // Demo shortcuts use real backend authentication and the database user identity.
  const handleQuickDemoLogin = async profile => {
    if (loginLock.current) return;
    if (!profile.password) {
      setEmail(profile.email);
      setPassword("");
      setShowDemos(false);
      Alert.alert("Athlete sign-in", "Enter the current password for this athlete account and tap Sign in.");
      return;
    }
    loginLock.current = true;
    setLoading(true);
    try {
      const userData = await login(profile.email, profile.password);
      onLoginSuccess?.(userData);
    } catch (error) {
      Alert.alert("Demo sign-in failed", error.message || "Could not sign in with this demo account. Please check the server and demo data.");
    } finally {
      loginLock.current = false;
      setLoading(false);
    }
  };

  // Live Backend Authentication
  const handleLiveLogin = async () => {
    if (loginLock.current) return;
    if (!email.trim() || !password) {
      Alert.alert("Input Required", "Please enter both Email and Password.");
      return;
    }
    loginLock.current = true;
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      Alert.alert(err?.status === 401 ? "Login Failed" : "Connection Error", err?.message || `Could not reach server at ${ipconfig.ip}:9999.`);
    } finally {
      loginLock.current = false;
      setLoading(false);
    }
  };
  if (accountPage) return <AccountScreen mode={accountPage} onBack={() => setAccountPage(null)} />;
  const actionRow = (icon, title, subtitle, onPress, blue = false) => <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={onPress} activeOpacity={0.75} style={[styles.actionRow, blue && styles.blueRow]}>
      <Ionicons name={icon} size={28} color={blue ? "#17617A" : colors.gov.primary} />
      <View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={blue ? "#17617A" : colors.brand.dark} />
    </TouchableOpacity>;
  return <View style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <AppScreenScroll contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} header={<AppHeader variant="compact" title="Welcome to KhelGujarat" subtitle="Sports facilities, training and athlete services" />}>


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
                {[{
                icon: "location-outline",
                title: "Find facilities"
              }, {
                icon: "calendar-outline",
                title: "Book a slot"
              }].map((item, index) => <TouchableOpacity accessibilityRole="button" disabled={loading} key={item.title} onPress={onExplorePublic} style={[styles.quickAction, index > 0 && styles.quickBorder]}><Ionicons name={item.icon} size={27} color={colors.gov.primary} /><Text style={styles.quickLabel}>{item.title}</Text></TouchableOpacity>)}
              </View>
            </View>}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{
            expanded: showDemos
          }} disabled={loading} onPress={() => setShowDemos(!showDemos)} style={styles.demoToggle}><Text style={styles.demoToggleText}>Try a demo account</Text><Ionicons name={showDemos ? "chevron-up" : "chevron-down"} size={15} color="#6B8075" /></TouchableOpacity>
            {showDemos && DEMO_PROFILES.map(profile => <TouchableOpacity accessibilityRole="button" key={profile.role} disabled={loading} onPress={() => handleQuickDemoLogin(profile)} style={styles.demoCard}><View style={{
              flex: 1
            }}><Text style={styles.actionTitle}>{profile.name}</Text><Text style={styles.actionSubtitle}>{profile.title}</Text></View><Ionicons name="arrow-forward" size={20} color={colors.gov.primary} /></TouchableOpacity>)}
            <View style={styles.footer}><Ionicons name="shield-checkmark-outline" size={13} color="#82958B" /><Text style={styles.footerText}>Sports Authority of Gujarat</Text></View>
          </View>
        </AppScreenScroll>
      </KeyboardAvoidingView>
    </View>;
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#084733"
  },
  keyboardView: {
    flex: 1,
    backgroundColor: "#F5F8F6"
  },
  scrollContent: {
    paddingBottom: 24
  },
  body: {
    paddingHorizontal: 18,
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    marginTop: 0
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 21,
    borderWidth: 1,
    borderColor: "#E8EEEA",
    shadowColor: "#123C29",
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  accountIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center"
  },
  headingCopy: {
    flex: 1
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gov.primary,
    marginBottom: 3
  },
  cardHeader: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: "#142C21"
  },
  cardIntro: {
    fontSize: 12,
    lineHeight: 20,
    color: "#718078",
    marginTop: 13,
    marginBottom: 23
  },
  inputGroup: {
    marginBottom: 17
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#243D30",
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E9E5",
    backgroundColor: "#F8FAF9"
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 51,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#193C29"
  },
  eyeBtn: {
    minWidth: 44,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  submitBtn: {
    minHeight: 52,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: colors.gov.primary,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3
  },
  disabled: {
    opacity: 0.6
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff"
  },
  forgot: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gov.primary
  },
  divider: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginVertical: 12
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8EEEA"
  },
  dividerText: {
    fontSize: 10,
    color: "#8A9890"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#EFF8F2",
    borderRadius: 13,
    padding: 13,
    marginTop: 10
  },
  blueRow: {
    backgroundColor: "#EDF6FA"
  },
  actionCopy: {
    flex: 1
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#193728",
    lineHeight: 18
  },
  actionSubtitle: {
    fontSize: 10,
    lineHeight: 17,
    color: "#718078",
    marginTop: 2
  },
  quickCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EEE9",
    marginTop: 18,
    overflow: "hidden"
  },
  quickHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EDF7F0",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand.dark
  },
  quickGrid: {
    flexDirection: "row",
    paddingVertical: 17
  },
  quickAction: {
    flex: 1,
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  quickBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "#E7EEE9"
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#254331",
    textAlign: "center"
  },
  demoToggle: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 48,
    marginTop: 10
  },
  demoToggleText: {
    color: "#6B8075",
    fontSize: 11
  },
  demoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E7EEE9"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10
  },
  footerText: {
    fontSize: 9,
    color: "#82958B"
  }
});
export default LoginScreen;
