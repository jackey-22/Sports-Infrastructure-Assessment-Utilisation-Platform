import { StyleSheet, Platform } from "react-native";
import { colors } from "./colors";

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // Card Containers
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDark: {
    backgroundColor: colors.gov.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.slate[700],
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // Typography
  titleLg: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  titleMd: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
  },
  titleSm: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  captionText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  // Row & Flex Helpers
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Badges & Pills
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.gov.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Platform.select({
      ios: {
        shadowColor: colors.gov.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: colors.brand.soft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.gov.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  // Input fields
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 12,
  },
});

export default commonStyles;
