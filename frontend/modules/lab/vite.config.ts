import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// This is a REMOTE: a standalone department-package project that exposes one
// module for the web-shell host to load at runtime. It also runs fine on its
// own (npm run dev) via index.html/src/main.tsx, for working on it in
// isolation without the host running.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "lab_remote",
      filename: "remoteEntry.js",
      exposes: {
        "./module": "./src/module.tsx",
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
  server: { port: 5176, strictPort: true, cors: true },
  build: { target: "esnext", modulePreload: false },
});
