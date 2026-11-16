import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { workspaceAliases } from "../../workspace.config";

export default defineConfig({
  plugins: [react()],
  // Bundle workspace packages straight from source.
  resolve: { alias: workspaceAliases },
  // Tauri expects a fixed port + relative base.
  base: "./",
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { outDir: "dist", target: "es2022", sourcemap: true },
});
