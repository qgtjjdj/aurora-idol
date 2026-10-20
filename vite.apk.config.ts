import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "apk",
  publicDir: "../apk-public",
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../android/app/src/main/assets",
    emptyOutDir: true,
    assetsDir: "pack",
  },
});
