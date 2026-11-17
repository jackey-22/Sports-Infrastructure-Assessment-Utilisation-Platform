import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { login } from "../../services/authService";
import ipconfig from "../../../ipconfig";

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
    if (!email || !password) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero branding */}
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.logoFrame}>
                <Image
                  source={require("../../../assets/Logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.govTitle}>GOVERNMENT OF GUJARAT</Text>
                <Text style={styles.heroEyebrow}>SPORTS AUTHORITY OF GUJARAT</Text>
              </View>
              <View style={styles.securePill}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#bbf7d0" />
                <Text style={styles.secureText}>SECURE</Text>
              </View>
            </View>
            <Text style={styles.appTitle}>Welcome to KhelGujarat</Text>
            <Text style={styles.tagline}>
              One portal for sports facilities, training and athlete services.
            </Text>
          </View>

          {/* Credentials Card */}
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>ACCOUNT ACCESS</Text>
            <Text style={styles.cardHeader}>Sign in to continue</Text>
            <Text style={styles.cardIntro}>Use your registered email and password to access your dashboard.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICIAL EMAIL / CITIZEN ID</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@sag.gujarat.gov.in"
                  placeholderTextColor={colors.slate[400]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.slate[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.slate[400]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLiveLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Public Explore Entry Button */}
            {onExplorePublic && (
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={onExplorePublic}
                activeOpacity={0.7}
              >
                <Ionicons name="compass-outline" size={18} color={colors.gov.primary} style={{ marginRight: 6 }} />
                <Text style={styles.exploreBtnText}>Browse Gujarat Facilities as Public Visitor</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeaderRow}>
              <View style={styles.quickIcon}>
                <Ionicons name="flash" size={15} color={colors.gov.accent} />
              </View>
              <Text style={styles.demoSectionTitle}>QUICK ACTIONS</Text>
            </View>
            <Text style={styles.demoSectionDesc}>
              Try the portal with a ready-to-use Coach or Athlete/Citizen account.
            </Text>

            <View style={styles.demoProfilesGrid}>
              {DEMO_PROFILES.map((profile) => (
                <TouchableOpacity
                  key={profile.role}
                  style={styles.demoCard}
                  onPress={() => handleQuickDemoLogin(profile)}
                  activeOpacity={0.7}
                >
                  <View style={styles.demoCardTop}>
                    <Text style={styles.demoName} numberOfLines={1} ellipsizeMode="tail">
                      {profile.name}
                    </Text>
                    <View style={[styles.demoBadge, { backgroundColor: profile.badgeBg }]}>
                      <Text style={[styles.demoBadgeText, { color: profile.badgeColor }]}>
                        {profile.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.demoRoleTitle} numberOfLines={1} ellipsizeMode="tail">
                    {profile.title}
                  </Text>
                  <View style={styles.credentialRow}>
                    <Ionicons name="mail-outline" size={13} color={colors.slate[500]} />
                    <Text style={styles.credentialText} numberOfLines={1}>{profile.email}</Text>
                  </View>
                  <View style={styles.credentialRow}>
                    <Ionicons name="key-outline" size={13} color={colors.slate[500]} />
                    <Text style={styles.credentialText}>Password: {profile.password}</Text>
                  </View>
                  <View style={styles.demoAction}>
                    <Text style={styles.demoActionText}>Use this account</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.gov.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
    backgroundColor: colors.slate[50],
  },
  hero: {
    backgroundColor: colors.brand.dark,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? 22 : 14,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoFrame: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  brandHeader: {
    alignItems: "center",
    marginVertical: 18,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  govTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fcd34d",
    letterSpacing: 1,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: "#d1fae5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 3,
  },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  secureText: {
    color: "#bbf7d0",
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 4,
  },
  appTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginTop: 24,
  },
  tagline: {
    fontSize: 13,
    color: "#d1fae5",
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 310,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginHorizontal: 16,
    marginTop: -18,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.slate[800],
    marginTop: 3,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.gov.primary,
    letterSpacing: 1,
  },
  cardIntro: {
    fontSize: 12,
    color: colors.slate[500],
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: colors.slate[900],
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: colors.brand.soft,
  },
  exploreBtnText: {
    color: colors.gov.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  demoSection: {
    paddingHorizontal: 16,
  },
  demoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  quickIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
  },
  demoSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.slate[800],
    letterSpacing: 0.5,
  },
  demoSectionDesc: {
    fontSize: 12,
    color: colors.slate[500],
    marginBottom: 12,
    lineHeight: 18,
  },
  demoProfilesGrid: {
    gap: 10,
  },
  demoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  demoCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  demoName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[900],
    flex: 1,
    marginRight: 6,
  },
  demoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  demoRoleTitle: {
    fontSize: 12,
    color: colors.gov.primary,
    fontWeight: "600",
    marginBottom: 10,
  },
  demoDistrict: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  credentialText: {
    flex: 1,
    fontSize: 11,
    color: colors.slate[600],
    marginLeft: 7,
  },
  demoAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    marginTop: 12,
    paddingTop: 10,
  },
  demoActionText: {
    color: colors.gov.primary,
    fontSize: 12,
    fontWeight: "800",
  },
});

export default LoginScreen;
