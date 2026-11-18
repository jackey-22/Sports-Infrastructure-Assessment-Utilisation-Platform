# Shared app headers

All 20 active screen modules use AppHeader inside AppScreenScroll. This includes every signed-in role, public browsing and booking, login, registration, and password reset. The unused legacy SupervisorScanScreen and old root screens directory are excluded.

AppHeader owns the dark green gradient, real SAG logo, government branding, stadium watermark, wave edge, titles and action sizing. Use title, optional subtitle, onBack, onLogout, an actions array ({label, icon, onPress, disabled}), and variant="compact" for authentication. Actions without a callback are omitted; Back is never inferred. Standard titles allow two lines. There are no placeholder notification badges or numeric role codes.

AppScreenScroll takes the header as a React element and scrolls it together with content. Existing refresh controls, keyboard behavior and scroll callbacks pass through. contentContainerStyle applies to the body below the header; the shared layout supplies 16 points of top spacing. Do not add a fixed or sticky screen header.

AppShell owns SafeAreaProvider, one safe-area boundary outside scrolling content, and light status-bar icons on dark green. Screens use View roots, not nested SafeAreaView or screen StatusBar overrides. Full-screen camera/payment modals retain their own modal presentation. Bottom tabs do not add a second iOS safe-area inset.

CitizenHeader, SagHeader and FacilityHeader are compatibility exports only; new and active screens import AppHeader directly. Header changes require no backend, permissions or data changes.

Validation: node --test client-app/tests/*.test.cjs server/tests/*.test.js. Bundle checks: from client-app, npx --no-install expo export --platform android --output-dir .expo/header-check-android and the same command with --platform ios --output-dir .expo/header-check-ios. Device visual review of notches, large text, keyboard and scrolling is a separate check from mocked rendering and bundle validation.
