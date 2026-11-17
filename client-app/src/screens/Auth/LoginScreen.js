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
import ipconfig from "../../../ipconfig";

// Demo accounts matching client-web/src/Components/Auth/demoAuth.js
const DEMO_PROFILES = [
  {
    role: 5,
    name: "Dr. Hasmukh Patel",
    title: "State Director & SAG Admin",
    badge: "ROLE 5 · ADMIN",
    badgeBg: "#fee2e2",
    badgeColor: "#b91c1c",
    email: "admin@sag.gujarat.gov.in",
    district: "State Headquarters (Gandhinagar)",
  },
  {
    role: 4,
    name: "Vikram Rathore",
    title: "District Sports Officer (DSO)",
    badge: "ROLE 4 · AUTHORITY",
    badgeBg: "#fef3c7",
    badgeColor: "#b45309",
    email: "dso.ahmedabad@sag.gujarat.gov.in",
    district: "Ahmedabad District",
  },
  {
    role: 3,
    name: "Rajesh Vaghela",
    title: "Sports Complex Manager",
    badge: "ROLE 3 · MANAGER",
    badgeBg: "#dcfce7",
    badgeColor: "#15803d",
    email: "manager.khokhra@sag.gujarat.gov.in",
    district: "Khokhra Sports Complex",
  },
  {
    role: 2,
    name: "Coach Nitesh Shah",
    title: "Senior Badminton Coach",
    badge: "ROLE 2 · COACH",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    email: "coach.badminton@sag.gujarat.gov.in",
    district: "Khokhra & Naranpura",
  },
  {
    role: 1,
    name: "Mahesh Desai",
    title: "Ground Gate Supervisor",
    badge: "ROLE 1 · SUPERVISOR",
    badgeBg: "#e0f2fe",
    badgeColor: "#0369a1",
    email: "supervisor.khokhra@sag.gujarat.gov.in",
    district: "Khokhra Complex Gate A",
  },
  {
    role: 0,
    name: "Aarav Patel",
    title: "Citizen Athlete & Trainee",
    badge: "ROLE 0 · CITIZEN",
    badgeBg: "#e8f5ee",
    badgeColor: "#007D40",
    email: "aarav.patel@gmail.com",
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
      const response = await fetch(`http://${ipconfig.ip}:9999/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const resData = await response.json();
      if (response.ok && resData.token) {
        await AsyncStorage.setItem("token", resData.token);
        // Verify token to get user payload
        const verifyRes = await fetch(`http://${ipconfig.ip}:9999/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resData.token }),
        });
        const verifyData = await verifyRes.json();
        const userData = verifyData.data || { Role: 0, Email: email };
        await AsyncStorage.setItem("userData", JSON.stringify(userData));

        if (onLoginSuccess) {
          onLoginSuccess(userData);
        }
      } else {
        Alert.alert("Login Failed", resData.message || resData.msg || "Invalid credentials.");
      }
    } catch (err) {
      Alert.alert(
        "Connection Error",
        `Could not reach server at ${ipconfig.ip}:9999. You can use the 1-Tap Demo Switcher below to test all role facilities offline.`
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
          {/* Header Branding */}
          <View style={styles.brandHeader}>
            <Image
              source={require("../../../assets/Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.govTitle}>GOVERNMENT OF GUJARAT</Text>
            <Text style={styles.appTitle}>KhelGujarat GIS Portal</Text>
            <Text style={styles.tagline}>
              Sports Infrastructure Assessment, Utilization & Mapping Platform
            </Text>
          </View>

          {/* Credentials Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Sign in to your account</Text>

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

          {/* 1-Tap Quick Demo Role Switcher */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeaderRow}>
              <Ionicons name="flash" size={16} color={colors.gov.accent} />
              <Text style={styles.demoSectionTitle}>1-TAP DEMO ROLE SWITCHER</Text>
            </View>
            <Text style={styles.demoSectionDesc}>
              Instantly test and inspect all 6 state portal facilities without typing credentials:
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
                  <Text style={styles.demoDistrict} numberOfLines={1} ellipsizeMode="tail">
                    {profile.district}
                  </Text>
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
    padding: 20,
    paddingBottom: 40,
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
    color: colors.gov.accent,
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.brand.dark,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 24,
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
    fontSize: 16,
    fontWeight: "700",
    color: colors.slate[800],
    marginBottom: 16,
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
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  demoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate[800],
    letterSpacing: 0.5,
  },
  demoSectionDesc: {
    fontSize: 12,
    color: colors.slate[500],
    marginBottom: 14,
    lineHeight: 18,
  },
  demoProfilesGrid: {
    gap: 10,
  },
  demoCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
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
  },
  demoDistrict: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
});

export default LoginScreen;
