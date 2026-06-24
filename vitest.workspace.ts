import { defineWorkspace } from "vitest/config";

// Each TS block owns a vitest.config.ts under its package dir. That config points
// its `include` at the block's test tree under ../../tests/<block> (tests live
// separately from code) and restricts coverage to the block's own src/**.
export default defineWorkspace(["packages/*/vitest.config.ts"]);
