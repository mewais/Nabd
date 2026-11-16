// Where each workspace package lives. The map itself is the `paths` block of
// tsconfig.json (which the type checker reads); Vite and Vitest resolve
// `@nabd/<name>` to the same source entry points through the aliases derived here.

import { fileURLToPath } from "node:url";
import tsconfig from "./tsconfig.json";

export const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/** A `paths` wildcard (`@nabd/app/*` → a directory) is a prefix alias: both lose their `/*`. */
const withoutWildcard = (path: string): string => path.replace(/\/\*$/, "");

/** `@nabd/<name>` → that package's source entry point. */
export const workspaceAliases: Record<string, string> = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).flatMap(([name, entries]) =>
    entries.map((entry) => [withoutWildcard(name), fromRoot(withoutWildcard(entry))]),
  ),
);

/**
 * What the window shows before the app has painted (the dark theme's
 * background), for the build to put into index.html. Build tooling reads it
 * from the design system's source here, beside the map of where packages
 * live, so that no package reaches into another past its entry point.
 */
export { PREPAINT_BACKGROUND } from "./packages/design-system/src/theme";
