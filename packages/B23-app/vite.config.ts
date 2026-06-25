import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Resolve workspace packages to their source so Vite bundles them directly
// (mirrors the vitest alias setup).
const pkgs = [
  "domain",
  "dataset",
  "coverage",
  "scheduling",
  "progression",
  "session",
  "nudge",
  "analytics",
  "program-editor",
  "serialization",
  "ipc-client",
  "store",
  "design-system",
  "bodymap",
  "shell",
  "today",
  "planner",
  "progress",
  "modals",
];
const dirOf: Record<string, string> = {
  domain: "B01-domain",
  dataset: "B02-dataset",
  coverage: "B03-coverage",
  scheduling: "B04-scheduling",
  progression: "B05-progression",
  session: "B06-session",
  nudge: "B07-nudge",
  analytics: "B08-analytics",
  "program-editor": "B09-program-editor",
  serialization: "B10-serialization",
  "ipc-client": "B14-ipc-client",
  store: "B15-store",
  "design-system": "B16-design-system",
  bodymap: "B17-bodymap",
  shell: "B18-shell",
  today: "B19-today",
  planner: "B20-planner",
  progress: "B21-progress",
  modals: "B22-modals",
};
const alias = Object.fromEntries(
  pkgs.map((n) => [`@nabd/${n}`, r(`../${dirOf[n]}/src/index.ts`)]),
);

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  // Tauri expects a fixed port + relative base
  base: "./",
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { outDir: "dist", target: "es2022", sourcemap: true },
});
