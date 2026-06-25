import { defineConfig } from "vitest/config";

// Tests live OUTSIDE this package, under tests/B01-domain/. Coverage is restricted
// to this block's own src/** and enforced at 100%.
export default defineConfig({
  test: { environment: "node", globals: true,
    include: ["../../tests/B01-domain/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ["text", "json-summary"],
    },
  },
});
