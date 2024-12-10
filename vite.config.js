import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import momentTimezonePlugin from "vite-plugin-moment-timezone";
import { manualChunksPlugin } from "vite-plugin-webpackchunkname";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    manualChunksPlugin(),
    momentTimezonePlugin({
      zones: ["Europe/Berlin"],
      startYear: 2020,
      endYear: 2050,
    }),
    visualizer({ filename: "dist/stats.html" }),
    react(),
  ],
  esbuild: { legalComments: "external" },
  server: { watch: { usePolling: true } },
});
