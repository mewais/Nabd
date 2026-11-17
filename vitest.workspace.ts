// One test project per package that has tests — the suites of packages/<dir>
// live apart from the code, under tests/<dir>/ — and one for the local ESLint
// rules, under tests/scripts/. A package that draws (it
// depends on React) is tested in a DOM, any other in plain Node.
//
//   pnpm test                           every project
//   pnpm --filter @nabd/<name> test     one (its script runs this workspace with --project)

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { defineWorkspace } from "vitest/config";
import { fromRoot } from "./workspace.config";

interface Manifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function draws(dir: string): boolean {
  const manifest: Manifest = JSON.parse(
    readFileSync(fromRoot(`./packages/${dir}/package.json`), "utf8"),
  );
  return "react" in { ...manifest.dependencies, ...manifest.peerDependencies };
}

const tested = readdirSync(fromRoot("./packages")).filter((dir) =>
  existsSync(fromRoot(`./tests/${dir}`)),
);

export default defineWorkspace([
  ...tested.map((dir) => ({
    extends: "./vitest.config.ts",
    test: {
      name: dir,
      // Wherever Vitest is started from, paths are relative to the workspace.
      root: fromRoot("./"),
      include: [`tests/${dir}/**/*.test.{ts,tsx}`],
      environment: draws(dir) ? "happy-dom" : "node",
      setupFiles: draws(dir) ? ["./scripts/vitest.setup.ts"] : [],
    },
  })),
  // The local ESLint rules (scripts/eslint/), which are not a package.
  {
    extends: "./vitest.config.ts",
    test: {
      name: "scripts",
      root: fromRoot("./"),
      include: ["tests/scripts/**/*.test.ts"],
      environment: "node",
    },
  },
]);
