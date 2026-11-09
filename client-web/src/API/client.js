// Shared API client for client-web.
//
// One place for the base URL, the bearer token, JSON handling and error
// normalization so every role module talks to the backend the same way.
// Legacy components keep their own fetch calls; new integrations (starting
// with Citizen) must go through this client.
//
// Base URL comes from CRA's REACT_APP_API_BASE_URL, falling back to the
// development backend. Do not hardcode the host in service modules.

const DEFAULT_BASE_URL = "http://localhost:9999";

export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

// Normalized error thrown by every client call. `status` is the HTTP status
// (0 for a network failure) and `rcode` is the backend's application code.
export class ApiError extends Error {
  constructor(message, { status = 0, rcode = null, body = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.rcode = rcode;
    this.body = body;
  }
}

function getToken() {
  try {
    return localStorage.getItem("token");
  } catch (error) {
    return null;
  }
}

// Mirror the existing session behaviour: on an expired/invalid token, drop the
// stored token and send the user back to the login screen. Never logs secrets.
function handleSessionExpired() {
  try {
    localStorage.removeItem("token");
  } catch (error) {
    // ignore storage failures
  }
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function request(method, path, { body, headers, auth = true, signal } = {}) {
  const finalHeaders = { Accept: "application/json", ...(headers || {}) };
  let payload;

  if (body instanceof FormData) {
    // Let the browser set the multipart boundary.
    payload = body;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
    throw new ApiError("Network error: could not reach the server.", {
      status: 0,
    });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = null;
    }
  }

  if (response.status === 401) {
    handleSessionExpired();
    throw new ApiError(
      (data && data.msg) || "Your session has expired. Please sign in again.",
      { status: 401, rcode: data && data.rcode, body: data }
    );
  }

  if (!response.ok) {
    throw new ApiError(
      (data && data.msg) || `Request failed (${response.status}).`,
      { status: response.status, rcode: data && data.rcode, body: data }
    );
  }

  // Some endpoints answer HTTP 200 with a negative application code.
  if (data && typeof data.rcode === "number" && data.rcode < 0) {
    throw new ApiError(data.msg || "Request failed.", {
      status: response.status,
      rcode: data.rcode,
      body: data,
    });
  }

  return data;
}

export const api = {
  get: (path, options) => request("GET", path, options),
  post: (path, body, options) => request("POST", path, { ...options, body }),
  patch: (path, body, options) => request("PATCH", path, { ...options, body }),
  del: (path, options) => request("DELETE", path, options),
  // Multipart upload; pass a FormData instance.
  upload: (path, formData, options) =>
    request("POST", path, { ...options, body: formData }),
};
