import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((name) => name.endsWith(".css"))
            ? "assets/app.css"
            : "assets/[name][extname]",
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/app.js",
      },
    },
  },
  plugins: [react()],
});
