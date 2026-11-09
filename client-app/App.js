import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { LogBox } from "react-native";
import { useDispatch } from "react-redux";
import { Provider } from "react-redux";
import store from "./store";
import { NetworkActions } from "./store/Network";
import { NavigationContainer } from "@react-navigation/native";
import Main from "./screens/General/Main";
import { PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StripeProvider } from "@stripe/stripe-react-native";
import ipconfig from "./ipconfig";
LogBox.ignoreLogs([
  'Key "cancelled" in the image picker result is deprecated and will be removed in SDK 48, use "canceled" instead',
  "ViewPropTypes will be removed from React Native, along with all other PropTypes. We recommend that you migrate away from PropTypes and switch to a type system like TypeScript. If you need to continue using ViewPropTypes, migrate to the 'deprecated-react-native-prop-types' package.",
]);

// Attach the stored token to every backend call. Session restore (Main.js)
// still verifies the token with /verify before rendering.
const nativeFetch = global.fetch.bind(global);
global.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input && input.url;
  const isBackend = typeof url === "string" && url.includes(":9999/");
  const token = await AsyncStorage.getItem("token");
  let requestInit = init;

  if (isBackend && token) {
    const headers = new Headers(
      init.headers || (typeof input === "string" ? undefined : input.headers)
    );
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    requestInit = { ...init, headers };
  }

  const response = await nativeFetch(input, requestInit);
  if (
    isBackend &&
    response.status === 401 &&
    !url.includes("/login") &&
    !url.includes("/verify")
  ) {
    await AsyncStorage.removeItem("token");
  }
  return response;
};
const Network1 = ({ navigation }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    const getIpAddress = async () => {
      // Single source of truth for the backend host (client-app/ipconfig.js).
      dispatch(NetworkActions.getip(ipconfig.ip));
    };
    getIpAddress();
  }, []);
  return <Main />;
};

const STRIPE_KEY =
  "pk_test_51OHNVKSIijB4dZ7nuHBY1SWlQ8Jk0s0vVK5MMqy2fA81z0SfazlNSqilcLW4Do6bBpiKaM1PTDZ8sTdyGDUURdG400nSDgpU2Q";

export default function App() {
  return (
    <Provider store={store}>
      <StripeProvider publishableKey={STRIPE_KEY}>
        <NavigationContainer>
          <Network1 />
        </NavigationContainer>
      </StripeProvider>
    </Provider>
  );
}
