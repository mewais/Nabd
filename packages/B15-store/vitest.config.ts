import { defineConfig } from "vitest/config";

// Tests live OUTSIDE this package, under tests/B15-store/. Coverage is restricted
// to this block's own src/** and enforced at 100%.
export default defineConfig({
  test: { environment: "happy-dom", globals: true,
    include: ["../../tests/B15-store/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ["text", "json-summary"],
    },
  },
});
