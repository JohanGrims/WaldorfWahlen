import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import momentTimezonePlugin from "vite-plugin-moment-timezone";
import { manualChunksPlugin } from "vite-plugin-webpackchunkname";
import { readFileSync } from "fs";
import { join } from "path";
import process from "node:process";

// Read package.json to get dependencies
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8")
);
const dependencies = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {}),
];

// Add common large libraries that might not be direct dependencies
const commonLargePackages = [
  "react-dom",
  "react-router-dom",
  "firebase",
  "moment",
  "lodash",
  "rxjs",
  "date-fns",
  "core-js",
  "regenerator-runtime",
  "tslib",
  "html2canvas",
];

const allPackages = [...new Set([...dependencies, ...commonLargePackages])];

// Create individual chunks for each package
const packageToChunk = {};
allPackages.forEach((pkg) => {
  // Convert package names to valid chunk names
  const chunkName = `vendor-${pkg.replace(/[@/]/g, "-")}`;
  packageToChunk[pkg] = chunkName;
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    manualChunksPlugin(),
    momentTimezonePlugin({
      zones: ["Europe/Berlin"],
      startYear: 2020,
      endYear: 2050,
    }),
    visualizer({ filename: "dist/stats.html" }),
  ],
  esbuild: { legalComments: "external" },
  server: { watch: { usePolling: true } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Splitting node_modules into separate chunks based on package.json
          if (id.includes("node_modules")) {
            // Extract the package name from the path
            const parts = id.split("node_modules/");
            if (parts.length > 1) {
              const packagePath = parts[parts.length - 1];

              // Handle scoped packages (e.g., @mdui/icons)
              let packageName;
              if (packagePath.startsWith("@")) {
                const scopedParts = packagePath.split("/");
                if (scopedParts.length >= 2) {
                  packageName = `${scopedParts[0]}/${scopedParts[1]}`;
                }
              } else {
                // Regular packages
                packageName = packagePath.split("/")[0];
              }

              // Check if this package is in our dependencies
              if (packageName && packageToChunk[packageName]) {
                return packageToChunk[packageName];
              }

              // Check if any of our dependencies is a substring of this package
              // This handles cases where packages have different internal structures
              const matchingDep = allPackages.find(
                (dep) =>
                  packageName &&
                  (packageName.includes(dep) || dep.includes(packageName))
              );

              if (matchingDep && packageToChunk[matchingDep]) {
                return packageToChunk[matchingDep];
              }
            }

            // A catch-all vendor chunk for other node_modules
            return "vendor";
          }
        },
      },
    },
  },
});
