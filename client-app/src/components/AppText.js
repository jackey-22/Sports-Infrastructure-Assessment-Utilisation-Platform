import React, { createContext, forwardRef, useContext } from "react";
import { Text as NativeText, TextInput as NativeTextInput, StyleSheet } from "react-native";

const WeightContext = createContext("400");
const families = {
  100: "PlusJakartaSans_400Regular", 200: "PlusJakartaSans_400Regular", 300: "PlusJakartaSans_400Regular",
  400: "PlusJakartaSans_400Regular", 500: "PlusJakartaSans_500Medium",
  600: "PlusJakartaSans_600SemiBold", 700: "PlusJakartaSans_700Bold",
  800: "PlusJakartaSans_800ExtraBold", 900: "PlusJakartaSans_800ExtraBold",
  normal: "PlusJakartaSans_400Regular", bold: "PlusJakartaSans_700Bold",
};
function fontStyle(style, inheritedWeight) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return null;
  return { fontFamily: families[flat.fontWeight || inheritedWeight] || families[400], fontWeight: "normal" };
}
export const Text = forwardRef(function AppText({ style, children, ...props }, ref) {
  const inheritedWeight = useContext(WeightContext);
  const weight = StyleSheet.flatten(style)?.fontWeight || inheritedWeight;
  return <WeightContext.Provider value={weight}><NativeText ref={ref} {...props} style={[style, fontStyle(style, weight)]}>{children}</NativeText></WeightContext.Provider>;
});
export const TextInput = forwardRef(function AppTextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={[style, fontStyle(style, "400")]} />;
});
