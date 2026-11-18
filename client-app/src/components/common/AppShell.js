import React from "react";
import { View, StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { APP_BACKGROUND, HEADER_GREEN } from "./AppHeader";
export default function AppShell({
  children
}) {
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} /><View style={styles.content}>{children}</View></SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HEADER_GREEN
  },
  content: {
    flex: 1,
    backgroundColor: APP_BACKGROUND
  }
});
