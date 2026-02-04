import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString()),
  },
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: {
      host: process.env.HMR_HOST || "localhost",
      port: Number(process.env.HMR_PORT || 5173),
      clientPort: Number(process.env.HMR_PORT || 5173),
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
