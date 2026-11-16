// What every test project shares: how `@nabd/<name>` resolves, the globals,
// and what coverage is measured on. The projects are in vitest.workspace.ts.

import { defineConfig } from "vitest/config";
import { workspaceAliases } from "./workspace.config";

export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
    },
  },
});
