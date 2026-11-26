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

async function resolveHeaders(headers = {}, auth = true, isFormData = false, hasBody = false) {
  const finalHeaders = { Accept: "application/json", ...headers };
  if (!isFormData && hasBody && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = await AsyncStorage.getItem("token");
    if (token && !token.startsWith("demo_")) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }
  return finalHeaders;
}

async function parseJsonResponse(status, text) {
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new ApiError("The server returned an invalid response.", { status });
    }
  }

  if (status === 401) {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userData");
    throw new ApiError(data?.msg || "Your session has expired. Please sign in again.", {
      status: 401,
      rcode: data?.rcode,
      body: data,
    });
  }

  if (status < 200 || status >= 300 || (typeof data?.rcode === "number" && data.rcode < 0)) {
    throw new ApiError(
      data?.msg || `Request failed (${status}).`,
      { status, rcode: data?.rcode, body: data }
    );
  }

  return data || {};
}

function uploadWithXhr(url, headers, formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== "content-type" && value !== undefined) {
        xhr.setRequestHeader(key, value);
      }
    });
    xhr.timeout = 45000;
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText || "" });
    xhr.onerror = () => reject(new Error("Network error: could not reach the server."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Check your connection and try again."));
    xhr.send(formData);
  });
}

async function request(method, path, { body, headers = {}, auth = true } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders = await resolveHeaders(headers, auth, isFormData, body !== undefined);
  const payload = isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
    });
  } catch (error) {
    if (isFormData && typeof XMLHttpRequest !== "undefined") {
      try {
        const xhrRes = await uploadWithXhr(`${API_BASE_URL}${path}`, finalHeaders, payload);
        return await parseJsonResponse(xhrRes.status, xhrRes.text);
      } catch (xhrError) {
        throw new ApiError(xhrError?.message || "Network error: could not reach the server.", {
          status: 0,
        });
      }
    }
    throw new ApiError(
      error?.message && error.message !== "Network request failed"
        ? `Network error: ${error.message}`
        : "Network error: could not reach the server.",
      { status: 0 }
    );
  }

  const text = await response.text();
  return parseJsonResponse(response.status, text);
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
