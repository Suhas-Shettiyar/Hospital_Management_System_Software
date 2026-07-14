import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend calls "/api/..."; Vite proxies that to the FastAPI backend on :8000.
// This avoids CORS issues in development and matches the production path layout.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
