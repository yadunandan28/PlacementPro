import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // More-specific rule must come first — Vite matches in order
      "/api/interview": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
