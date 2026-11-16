import { defineWorkspace } from "vitest/config";

// One project per package: packages/<dir>/vitest.config.ts runs the tests under
// tests/<dir>/ (tests live apart from the code they cover).
export default defineWorkspace(["packages/*/vitest.config.ts"]);
