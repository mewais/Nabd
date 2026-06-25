import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests live OUTSIDE this package, under tests/B06-session/. Coverage is restricted
// to this block's own src/** and enforced at 100%.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@nabd/domain": r("../B01-domain/src/index.ts"),
      "@nabd/dataset": r("../B02-dataset/src/index.ts"),
      "@nabd/coverage": r("../B03-coverage/src/index.ts"),
      "@nabd/scheduling": r("../B04-scheduling/src/index.ts"),
      "@nabd/progression": r("../B05-progression/src/index.ts"),
      "@nabd/session": r("../B06-session/src/index.ts"),
      "@nabd/nudge": r("../B07-nudge/src/index.ts"),
      "@nabd/analytics": r("../B08-analytics/src/index.ts"),
      "@nabd/program-editor": r("../B09-program-editor/src/index.ts"),
      "@nabd/serialization": r("../B10-serialization/src/index.ts"),
      "@nabd/ipc-client": r("../B14-ipc-client/src/index.ts"),
      "@nabd/store": r("../B15-store/src/index.ts"),
      "@nabd/design-system": r("../B16-design-system/src/index.ts"),
      "@nabd/bodymap": r("../B17-bodymap/src/index.ts"),
      "@nabd/shell": r("../B18-shell/src/index.ts"),
      "@nabd/today": r("../B19-today/src/index.ts"),
      "@nabd/planner": r("../B20-planner/src/index.ts"),
      "@nabd/progress": r("../B21-progress/src/index.ts"),
      "@nabd/modals": r("../B22-modals/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["../../tests/B06-session/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
    },
  },
});
