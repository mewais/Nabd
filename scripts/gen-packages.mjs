#!/usr/bin/env node
// Phase-0 boilerplate generator. Creates consistent package.json / tsconfig.json /
// vitest.config.ts for every TS block package, plus its src/ and the parallel
// tests/<block>/ dir. Interface-bearing source (src/index.ts) and AGENT.md are
// authored separately by the architect; this only writes mechanical boilerplate.
// Idempotent: safe to re-run (won't clobber an existing src/index.ts or AGENT.md).

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// name = npm scope name; dir = packages/<dir>; env = test env; deps = workspace+external deps
const PKGS = [
  { dir: "B01-domain", name: "domain", env: "node", deps: { zod: "^3.23.8" } },
  { dir: "B02-dataset", name: "dataset", env: "node", deps: { "@nabd/domain": "workspace:*" } },
  { dir: "B03-coverage", name: "coverage", env: "node", deps: { "@nabd/domain": "workspace:*", "@nabd/dataset": "workspace:*" } },
  { dir: "B04-scheduling", name: "scheduling", env: "node", deps: { "@nabd/domain": "workspace:*", "@nabd/dataset": "workspace:*" } },
  { dir: "B05-progression", name: "progression", env: "node", deps: { "@nabd/domain": "workspace:*" } },
  { dir: "B06-session", name: "session", env: "node", deps: { "@nabd/domain": "workspace:*", "@nabd/coverage": "workspace:*", "@nabd/progression": "workspace:*" } },
  { dir: "B07-nudge", name: "nudge", env: "node", deps: { "@nabd/domain": "workspace:*", "@nabd/scheduling": "workspace:*" } },
  { dir: "B08-analytics", name: "analytics", env: "node", deps: { "@nabd/domain": "workspace:*" } },
  { dir: "B09-program-editor", name: "program-editor", env: "node", deps: { "@nabd/domain": "workspace:*", "@nabd/dataset": "workspace:*" } },
  { dir: "B10-serialization", name: "serialization", env: "node", deps: { "@nabd/domain": "workspace:*" } },
  { dir: "B14-ipc-client", name: "ipc-client", env: "node", deps: { "@nabd/domain": "workspace:*", "@tauri-apps/api": "^2.0.0" } },
  { dir: "B15-store", name: "store", env: "happy-dom", deps: { "@nabd/domain": "workspace:*", "@nabd/dataset": "workspace:*", "@nabd/coverage": "workspace:*", "@nabd/scheduling": "workspace:*", "@nabd/progression": "workspace:*", "@nabd/session": "workspace:*", "@nabd/nudge": "workspace:*", "@nabd/analytics": "workspace:*", "@nabd/program-editor": "workspace:*", "@nabd/serialization": "workspace:*", "@nabd/ipc-client": "workspace:*", zustand: "^4.5.5" } },
  { dir: "B16-design-system", name: "design-system", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*" } },
  { dir: "B17-bodymap", name: "bodymap", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/coverage": "workspace:*" } },
  { dir: "B18-shell", name: "shell", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/design-system": "workspace:*", "@nabd/bodymap": "workspace:*" } },
  { dir: "B19-today", name: "today", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/design-system": "workspace:*", "@nabd/bodymap": "workspace:*" } },
  { dir: "B20-planner", name: "planner", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/design-system": "workspace:*", "@nabd/bodymap": "workspace:*" } },
  { dir: "B21-progress", name: "progress", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/design-system": "workspace:*", "@nabd/bodymap": "workspace:*" } },
  { dir: "B22-modals", name: "modals", env: "happy-dom", react: true, deps: { "@nabd/domain": "workspace:*", "@nabd/design-system": "workspace:*", "@nabd/bodymap": "workspace:*" } },
];

const w = (p, s) => writeFileSync(join(ROOT, p), s.endsWith("\n") ? s : s + "\n");
const ensure = (p) => mkdirSync(join(ROOT, p), { recursive: true });
const writeIfAbsent = (p, s) => { if (!existsSync(join(ROOT, p))) w(p, s); };

for (const pkg of PKGS) {
  const base = `packages/${pkg.dir}`;
  ensure(`${base}/src`);
  ensure(`tests/${pkg.dir}`);

  const devDeps = {};
  if (pkg.react) {
    Object.assign(devDeps, {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "@testing-library/react": "^16.0.1",
    });
  }

  const packageJson = {
    name: `@nabd/${pkg.name}`,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "src/index.ts",
    types: "src/index.ts",
    exports: { ".": "./src/index.ts" },
    scripts: { test: "vitest run", "test:cov": "vitest run --coverage" },
    dependencies: pkg.deps,
    ...(Object.keys(devDeps).length ? { peerDependencies: devDeps } : {}),
  };
  w(`${base}/package.json`, JSON.stringify(packageJson, null, 2));

  w(
    `${base}/tsconfig.json`,
    JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        // composite/rootDir off: cross-package imports resolve via path mapping
        // (pulling in sibling src), which a per-package rootDir would reject.
        compilerOptions: { noEmit: true },
        include: ["src/**/*", `../../tests/${pkg.dir}/**/*`],
      },
      null,
      2,
    ),
  );

  // Alias every workspace package to its SOURCE entry so vitest instruments it
  // (resolving via the node_modules symlink would mark it external -> 0% coverage).
  const aliasEntries = PKGS.map(
    (p) => `      "@nabd/${p.name}": r("../${p.dir}/src/index.ts"),`,
  ).join("\n");
  const setup = pkg.react ? `\n    setupFiles: ["../../scripts/vitest.setup.ts"],` : "";
  w(
    `${base}/vitest.config.ts`,
    `import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests live OUTSIDE this package, under tests/${pkg.dir}/. Coverage is restricted
// to this block's own src/** and enforced at 100%.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
${aliasEntries}
    },
  },
  test: {
    environment: "${pkg.env}",
    globals: true,${setup}
    include: ["../../tests/${pkg.dir}/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ["text", "json-summary"],
    },
  },
});
`,
  );

  // Do not clobber architect-authored interface/spec files.
  writeIfAbsent(
    `${base}/src/index.ts`,
    `// SKELETON PLACEHOLDER for @nabd/${pkg.name}. Replaced by the architect-authored\n// interface skeleton during Phase 0. Coding agents fill the bodies.\nexport {};\n`,
  );
}

console.log(`generated boilerplate for ${PKGS.length} packages`);
