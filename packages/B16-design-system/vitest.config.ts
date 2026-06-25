import { defineConfig } from "vitest/config";

// Tests live OUTSIDE this package, under tests/B16-design-system/. Coverage is restricted
// to this block's own src/** and enforced at 100%.
export default defineConfig({
  test: { environment: "happy-dom", globals: true, setupFiles: ["../../scripts/vitest.setup.ts"],
    include: ["../../tests/B16-design-system/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ["text", "json-summary"],
    },
  },
});
