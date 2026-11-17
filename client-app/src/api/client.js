import AsyncStorage from "@react-native-async-storage/async-storage";
import ipconfig from "../../ipconfig";

export const API_BASE_URL = `http://${ipconfig.ip}:9999`;

export class ApiError extends Error {
  constructor(message, { status = 0, rcode = null, body = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.rcode = rcode;
    this.body = body;
  }
}

async function request(method, path, { body, headers = {}, auth = true } = {}) {
  const finalHeaders = { Accept: "application/json", ...headers };
  let payload = body;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = await AsyncStorage.getItem("token");
    if (token && !token.startsWith("demo_")) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
    });
  } catch (error) {
    throw new ApiError("Network error: could not reach the server.", { status: 0 });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new ApiError("The server returned an invalid response.", {
        status: response.status,
      });
    }
  }

  if (response.status === 401) {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userData");
    throw new ApiError(data?.msg || "Your session has expired. Please sign in again.", {
      status: 401,
      rcode: data?.rcode,
      body: data,
    });
  }

  if (!response.ok || (typeof data?.rcode === "number" && data.rcode < 0)) {
    throw new ApiError(
      data?.msg || `Request failed (${response.status}).`,
      { status: response.status, rcode: data?.rcode, body: data }
    );
  }

  return data || {};
}

export const api = {
  get: (path, options) => request("GET", path, options),
  post: (path, body, options) => request("POST", path, { ...options, body }),
  patch: (path, body, options) => request("PATCH", path, { ...options, body }),
  del: (path, options) => request("DELETE", path, options),
  upload: (path, formData, options) =>
    request("POST", path, { ...options, body: formData }),
};

export default api;
