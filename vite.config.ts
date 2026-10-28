import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

declare const process: { env: Record<string, string | undefined> };
const artifact = process.env.ARTIFACT === "1";
// BASE_PATH is set by the Pages workflow to "/<repo>/"; local dev and other hosts use "/".

export default defineConfig({
  base: artifact ? "./" : process.env.BASE_PATH ?? "/",
  build: { outDir: artifact ? "dist-artifact" : "dist", emptyOutDir: true },
  plugins: [
    react(),
    !artifact && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Accounting Study",
        short_name: "Study",
        description: "Flashcards, sorting, multiple choice and fill-the-blank for accounting courses.",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        start_url: process.env.BASE_PATH ?? "/",
        scope: process.env.BASE_PATH ?? "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  server: { port: 5180 },
});
