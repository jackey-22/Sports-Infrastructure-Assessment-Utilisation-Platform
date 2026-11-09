import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import store from "./store";
import App from "./App";

const API_ORIGIN = "http://localhost:9999";

// Attach the stored access token to every API call and clear the session on 401.
// Route loaders still verify the user with the backend before rendering.
if (typeof window !== "undefined" && !window.__authFetchInstalled) {
  window.__authFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input && input.url;
    const isApi = typeof url === "string" && url.startsWith(API_ORIGIN);
    const token = localStorage.getItem("token");
    const requestInit = { ...init };

    if (isApi && token) {
      const headers = new Headers(
        init.headers || (typeof input === "string" ? undefined : input.headers)
      );
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      requestInit.headers = headers;
    }

    return nativeFetch(input, requestInit).then((response) => {
      if (isApi && response.status === 401) {
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
      return response;
    });
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
