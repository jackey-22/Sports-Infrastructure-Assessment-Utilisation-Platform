import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

export async function login(email, password) {
  const result = await api.post(
    "/login",
    { Email: email.trim(), Password: password },
    { auth: false }
  );
  if (!result.token || !result.data) {
    throw new Error("The server did not return a valid login session.");
  }
  await AsyncStorage.setItem("token", result.token);
  await AsyncStorage.setItem("userData", JSON.stringify(result.data));
  return result.data;
}

export const register = (details) => api.post("/signup", { ...details, Role: 0 }, { auth: false });
export const forgotPassword = (email) => api.post("/forgot-password", { Email: email.trim() }, { auth: false });
export const resetPassword = (email, code, password) => api.post("/reset-password", { Email: email.trim(), code: code.trim(), Password: password }, { auth: false });

export async function logout() {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("userData");
}

export async function restoreSession() {
  const [token, userData] = await Promise.all([
    AsyncStorage.getItem("token"),
    AsyncStorage.getItem("userData"),
  ]);
  if (!token || !userData) return null;
  try {
    return JSON.parse(userData);
  } catch (error) {
    await logout();
    return null;
  }
}
