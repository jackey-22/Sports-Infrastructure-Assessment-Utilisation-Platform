import { defineConfig, normalizePath, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

const treatSourceJsAsJsx = {
  name: "treat-source-js-as-jsx",
  enforce: "pre",
  transform(code, id) {
    const file = normalizePath(id).split("?")[0];
    if (!file.includes("/src/") || !file.endsWith(".js")) return null;
    return transformWithEsbuild(code, id, {
      loader: "jsx",
      jsx: "automatic",
    });
  },
};

export default defineConfig({
  plugins: [treatSourceJsAsJsx, react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
