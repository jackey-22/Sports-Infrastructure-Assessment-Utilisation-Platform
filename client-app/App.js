import AppShell from "./src/components/common/AppShell";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { colors } from "./src/theme/colors";
import { logout, restoreSession as restoreStoredSession } from "./src/services/authService";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";

// Auth & Public Screens
import LoginScreen from "./src/screens/Auth/LoginScreen";
import GujaratExploreMapScreen from "./src/screens/Public/GujaratExploreMapScreen";
import ComplexDetailScreen from "./src/screens/Public/ComplexDetailScreen";
import BookingCheckoutScreen from "./src/screens/Public/BookingCheckoutScreen";

// Unified Role Navigator
import RoleNavigator from "./src/navigation/RoleNavigator";
const STRIPE_KEY = "pk_test_51OHNVKSIijB4dZ7nuHBY1SWlQ8Jk0s0vVK5MMqy2fA81z0SfazlNSqilcLW4Do6bBpiKaM1PTDZ8sTdyGDUURdG400nSDgpU2Q";
function AppContent() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [publicFacility, setPublicFacility] = useState(null);
  const [publicBookingFacility, setPublicBookingFacility] = useState(null);

  // Restore user session on launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await restoreStoredSession();
        if (session) setCurrentUser(session);
      } catch (e) {
        console.warn("Session restore error", e);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);
  const handleLoginSuccess = user => {
    setCurrentUser(user);
    setIsPublicMode(false);
  };
  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setIsPublicMode(false);
  };
  if (loading || !fontsLoaded && !fontError) {
    return <View style={styles.splashCenter}>
        <ActivityIndicator size="large" color={colors.gov.primary} />
      </View>;
  }

  // If user is authenticated, route to the unified role navigator
  if (currentUser) {
    return <StripeProvider publishableKey={STRIPE_KEY}>
        <RoleNavigator user={currentUser} onLogout={handleLogout} />
      </StripeProvider>;
  }

  // If in Public Visitor Exploration mode
  if (isPublicMode) {
    if (publicBookingFacility) {
      return <StripeProvider publishableKey={STRIPE_KEY}>
          <BookingCheckoutScreen facility={publicBookingFacility} onBack={() => setPublicBookingFacility(null)} onDone={() => {
          setPublicBookingFacility(null);
          setPublicFacility(null);
        }} />
        </StripeProvider>;
    }
    if (publicFacility) {
      return <StripeProvider publishableKey={STRIPE_KEY}>
          <ComplexDetailScreen facility={publicFacility} onBack={() => setPublicFacility(null)} onBookSlot={fac => {
          setPublicBookingFacility(fac);
        }} />
        </StripeProvider>;
    }
    return <StripeProvider publishableKey={STRIPE_KEY}>
        <GujaratExploreMapScreen onSelectFacility={fac => setPublicFacility(fac)} onBack={() => setIsPublicMode(false)} />
      </StripeProvider>;
  }

  // Default: Login screen with live credentials + 1-Tap Quick Demo Switcher + Public Explore
  return <StripeProvider publishableKey={STRIPE_KEY}>
      <LoginScreen onLoginSuccess={handleLoginSuccess} onExplorePublic={() => setIsPublicMode(true)} />
    </StripeProvider>;
}
export default function App() {
  return <AppShell><AppContent /></AppShell>;
}
const styles = StyleSheet.create({
  splashCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.dark
  }
});
