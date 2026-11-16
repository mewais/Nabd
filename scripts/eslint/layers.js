// The dependency direction between the workspace packages, as ESLint rules:
// for each package, the `@nabd/*` packages (and frameworks) it must not import.
//
//   domain ← view ← engines ← ipc-client ← store
//   domain ← view ← design-system ← bodymap ← screens
//   screens may use the engines, never the store; only `app` joins the two sides.

const ENGINES = [
  "dataset",
  "coverage",
  "scheduling",
  "progression",
  "session",
  "nudge",
  "analytics",
  "program-editor",
  "serialization",
];
const SCREENS = ["shell", "today", "planner", "progress", "modals"];

/** What each package may import, besides itself. */
const MAY_IMPORT = {
  domain: [],
  view: ["domain"],
  ...Object.fromEntries(ENGINES.map((engine) => [engine, ["domain", ...ENGINES]])),
  "ipc-client": ["domain"],
  store: ["domain", "view", ...ENGINES, "ipc-client"],
  "design-system": ["domain", "view"],
  bodymap: ["domain", "view", "coverage", "design-system"],
  ...Object.fromEntries(
    SCREENS.map((screen) => [screen, ["domain", "view", ...ENGINES, "design-system", "bodymap"]]),
  ),
};
const PACKAGES = [...Object.keys(MAY_IMPORT), "app"];

/** Packages that draw: everything else knows nothing of React. */
const DRAWS = new Set(["design-system", "bodymap", ...SCREENS, "app"]);
/** Packages that hold or wire the store. */
const KEEPS_STATE = new Set(["store", "app"]);

const banned = (name, why) => ({ name, message: why });

function restrictionsOf(name) {
  const allowed = new Set([name, ...MAY_IMPORT[name]]);
  const paths = PACKAGES.filter((other) => !allowed.has(other)).map((other) =>
    banned(
      `@nabd/${other}`,
      `@nabd/${name} must not depend on @nabd/${other}: see scripts/eslint/layers.js.`,
    ),
  );
  if (!DRAWS.has(name)) {
    paths.push(banned("react", `@nabd/${name} does not draw: React stays out of it.`));
  }
  if (!KEEPS_STATE.has(name)) {
    paths.push(banned("zustand", "Only @nabd/store and @nabd/app know the store."));
  }
  return paths;
}

/** One config block per package (all of `app` is allowed, so it has none). */
export const layerRules = Object.keys(MAY_IMPORT).map((name) => ({
  files: [`packages/${name}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: restrictionsOf(name),
        patterns: [
          {
            group: ["@nabd/*/*", "**/packages/**"],
            message: "Import a package through its entry point, `@nabd/<name>`.",
          },
        ],
      },
    ],
  },
}));
