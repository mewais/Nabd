import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import prepaint from "@nabd/design-system/prepaint.json" with { type: "json" };
import { workspaceAliases } from "../../workspace.config";

/** index.html paints the theme's own background (the design system's prepaint.json) until React has rendered. */
const paintsPrepaint: Plugin = {
  name: "nabd-prepaint",
  transformIndexHtml: (html) => html.replaceAll("%PREPAINT_BACKGROUND%", prepaint.background),
};

export default defineConfig({
  plugins: [react(), paintsPrepaint],
  // Bundle workspace packages straight from source.
  resolve: { alias: workspaceAliases },
  // Tauri expects a fixed port + relative base.
  base: "./",
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { outDir: "dist", target: "es2022", sourcemap: true },
});
