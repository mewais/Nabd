import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const dirs: Record<string, string> = {
  domain: "B01-domain", dataset: "B02-dataset", coverage: "B03-coverage",
  scheduling: "B04-scheduling", progression: "B05-progression", session: "B06-session",
  nudge: "B07-nudge", analytics: "B08-analytics", "program-editor": "B09-program-editor",
  serialization: "B10-serialization", "ipc-client": "B14-ipc-client", store: "B15-store",
  "design-system": "B16-design-system", bodymap: "B17-bodymap", shell: "B18-shell",
  today: "B19-today", planner: "B20-planner", progress: "B21-progress", modals: "B22-modals",
};
const alias = Object.fromEntries(
  Object.entries(dirs).map(([n, d]) => [`@nabd/${n}`, r(`../packages/${d}/src/index.ts`)]),
);
alias["react"] = r("../node_modules/react");
alias["react-dom"] = r("../node_modules/react-dom");
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    root: r("."),
    environment: "happy-dom",
    globals: true,
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
});
