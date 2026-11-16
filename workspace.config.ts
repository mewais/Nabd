// The one place that knows where each workspace package lives. Vite and Vitest
// resolve `@nabd/<name>` straight to source through these aliases
// (tsconfig.base.json `paths` mirrors this map for the type checker).

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const PACKAGE_DIRS: Record<string, string> = {
  domain: "B01-domain",
  dataset: "B02-dataset",
  coverage: "B03-coverage",
  scheduling: "B04-scheduling",
  progression: "B05-progression",
  session: "B06-session",
  nudge: "B07-nudge",
  analytics: "B08-analytics",
  "program-editor": "B09-program-editor",
  serialization: "B10-serialization",
  "ipc-client": "B14-ipc-client",
  store: "B15-store",
  "design-system": "B16-design-system",
  bodymap: "B17-bodymap",
  shell: "B18-shell",
  today: "B19-today",
  planner: "B20-planner",
  progress: "B21-progress",
  modals: "B22-modals",
};

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/** `@nabd/<name>` → that package's source entry point. */
export const workspaceAliases: Record<string, string> = Object.fromEntries(
  Object.entries(PACKAGE_DIRS).map(([name, dir]) => [
    `@nabd/${name}`,
    fromRoot(`./packages/${dir}/src/index.ts`),
  ]),
);

/**
 * The Vitest config for one package. Its tests live outside the package, under
 * tests/<dir>/; coverage is measured on the package's own source only.
 */
export function packageTestConfig(dir: string, environment: "node" | "happy-dom") {
  return defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
      environment,
      globals: true,
      setupFiles: environment === "happy-dom" ? [fromRoot("./scripts/vitest.setup.ts")] : [],
      include: [fromRoot(`./tests/${dir}/**/*.{test,spec}.{ts,tsx}`)],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        reporter: ["text", "json-summary"],
        reportOnFailure: true,
      },
    },
  });
}
