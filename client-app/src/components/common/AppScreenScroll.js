import React, { forwardRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { APP_BACKGROUND } from "./AppHeader";
// Header and content share one scroll container; existing refresh and keyboard props are forwarded.
export default forwardRef(function AppScreenScroll({
  header,
  children,
  contentContainerStyle,
  style,
  ...props
}, ref) {
  return <ScrollView ref={ref} showsVerticalScrollIndicator={false} {...props} style={[styles.scroll, style]} contentContainerStyle={styles.container}>{header}<View style={[contentContainerStyle, styles.content]}>{children}</View></ScrollView>;
});
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: APP_BACKGROUND
  },
  container: {
    flexGrow: 1
  },
  content: {
    paddingTop: 16
  }
});
