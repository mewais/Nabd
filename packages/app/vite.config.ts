import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { PREPAINT_BACKGROUND, workspaceAliases } from "../../workspace.config";

/** index.html paints the theme's own background until React has rendered. */
const prepaint: Plugin = {
  name: "nabd-prepaint",
  transformIndexHtml: (html) => html.replaceAll("%PREPAINT_BACKGROUND%", PREPAINT_BACKGROUND),
};

export default defineConfig({
  plugins: [react(), prepaint],
  // Bundle workspace packages straight from source.
  resolve: { alias: workspaceAliases },
  // Tauri expects a fixed port + relative base.
  base: "./",
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { outDir: "dist", target: "es2022", sourcemap: true },
});
