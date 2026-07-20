import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// Frontend calls "/api/..."; Vite proxies that to the FastAPI backend on :8000.
// This avoids CORS issues in development and matches the production path layout.
//
// federation() makes this the HOST: it dynamically loads remote modules
// (e.g. example_hello_remote on :5174) at runtime instead of them being
// statically imported/bundled. See src/modules/loadRemoteModules.ts for
// where those dynamic imports actually happen.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "web_shell_host",
      remotes: {
        example_hello_remote: {
          type: "module",
          name: "example_hello_remote",
          entry: "http://localhost:5174/remoteEntry.js",
          entryGlobalName: "example_hello_remote",
        },
        opd_remote: {
          type: "module",
          name: "opd_remote",
          entry: "http://localhost:5175/remoteEntry.js",
          entryGlobalName: "opd_remote",
        },
        lab_remote: {
          type: "module",
          name: "lab_remote",
          entry: "http://localhost:5176/remoteEntry.js",
          entryGlobalName: "lab_remote",
        },
        pharmacy_remote: {
          type: "module",
          name: "pharmacy_remote",
          entry: "http://localhost:5177/remoteEntry.js",
          entryGlobalName: "pharmacy_remote",
        },
        appointments_remote: {
          type: "module",
          name: "appointments_remote",
          entry: "http://localhost:5178/remoteEntry.js",
          entryGlobalName: "appointments_remote",
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.1.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.1.0" },
        "react-router-dom": { singleton: true, requiredVersion: "^7.1.0" },
        antd: { singleton: true, requiredVersion: "^5.22.0" },
        "@tanstack/react-query": { singleton: true, requiredVersion: "^5.59.0" },
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: { target: "esnext", modulePreload: false },
});
