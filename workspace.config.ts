// Where each workspace package lives. The map itself is the `paths` block of
// tsconfig.json (which the type checker reads); Vite and Vitest resolve
// `@nabd/<name>` to the same source entry points through the aliases derived here.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfig from "./tsconfig.json";

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/** `@nabd/<name>` → that package's source entry point. */
export const workspaceAliases: Record<string, string> = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).map(([name, [entry]]) => [name, fromRoot(entry)]),
);

/**
 * The Vitest config for one package. Its tests live outside the package, under
 * tests/<dir>/; coverage is measured on the package's own source only. Globs are
 * relative to the repository root, so they stay POSIX-style on every platform.
 */
export function packageTestConfig(dir: string, environment: "node" | "happy-dom") {
  return defineConfig({
    root: fromRoot("./"),
    resolve: { alias: workspaceAliases },
    test: {
      name: dir,
      environment,
      globals: true,
      setupFiles: environment === "happy-dom" ? ["./scripts/vitest.setup.ts"] : [],
      include: [`tests/${dir}/**/*.{test,spec}.{ts,tsx}`],
      coverage: {
        provider: "v8",
        include: [`packages/${dir}/src/**/*.{ts,tsx}`],
        reporter: ["text", "json-summary"],
        reportOnFailure: true,
      },
    },
  });
}
