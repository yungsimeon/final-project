import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5005",
        changeOrigin: true,
        // Uncomment the following line if you want to prepend the path '/api' to the target URL
        // prependPath: true,
      },
    },
  },
});
