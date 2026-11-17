// The dependency direction between the workspace packages, as ESLint rules:
// for each package, the `@nabd/*` packages (and frameworks) it must not import.
// The README draws the same graph (`layerDiagram`, which tests/scripts checks
// it against).
//
// Every package, and the tests, import a package through its entry point
// `@nabd/<name>` only: never a file inside it, by alias (`@nabd/x/src/…`) or
// by a relative path into another package (`../../x/src/…`).

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

/**
 * What each package may import, besides itself. `app` may import every package.
 * @type {Record<string, string[]>}
 */
export const MAY_IMPORT = {
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

/** Imports that reach past a package's entry point: by alias, or by a relative path. */
export const PAST_THE_ENTRY_POINT = [
  {
    // A package's plain-data file it publishes (`@nabd/design-system/prepaint.json`) is no code.
    group: ["@nabd/*/*", "!@nabd/*/*.json"],
    message: "Import a package through its entry point, `@nabd/<name>`.",
  },
  {
    regex: String.raw`^(\.\./)+(packages/)?[\w-]+/src(/|$)`,
    message: "Import another package through its entry point, `@nabd/<name>`, not by path.",
  },
];

/** The packages and frameworks `name` must not import (exported for the rule's tests). */
export function restrictionsOf(name) {
  const allowed = new Set([name, ...(MAY_IMPORT[name] ?? PACKAGES)]);
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

const block = (files, paths, patterns = PAST_THE_ENTRY_POINT) => ({
  files,
  rules: { "no-restricted-imports": ["error", { paths, patterns }] },
});

/** The app has no entry point of its own (it is the program), so its tests import its modules. */
const APP_MODULES_ALLOWED = [
  { ...PAST_THE_ENTRY_POINT[0], group: [...PAST_THE_ENTRY_POINT[0].group, "!@nabd/app/*"] },
  PAST_THE_ENTRY_POINT[1],
];

/**
 * One config block per package; one for the unit tests, which may use any
 * package; and one for the end-to-end specs, which run in Node and drive the
 * UI through a browser, so may use only what does not draw (the domain, the
 * engines, their fixtures) — never the UI's own code, the store or React.
 */
export const layerRules = [
  ...PACKAGES.map((name) => block([`packages/${name}/**/*.{ts,tsx}`], restrictionsOf(name))),
  block(["tests/**/*.{ts,tsx}"], [], APP_MODULES_ALLOWED),
  block(
    ["e2e/**/*.ts"],
    [...DRAWS, "store"].map((name) =>
      banned(
        `@nabd/${name}`,
        "The end-to-end specs drive the UI through the browser, not its code.",
      ),
    ),
  ),
];

/** A group of packages that import alike, drawn as one line. */
const GROUPS = { engines: ENGINES, screens: SCREENS };

/** `names` with each group whose members are all among them written as the group's name. */
function grouped(names) {
  const out = [];
  for (const name of names) {
    const group = Object.entries(GROUPS).find(
      ([, members]) => members.includes(name) && members.every((m) => names.includes(m)),
    );
    if (!group) out.push(name);
    else if (!out.includes(group[0])) out.push(group[0]);
  }
  return out;
}

/**
 * The graph as the README draws it: one line per package, or group of
 * packages that import alike, with what it may import.
 */
export function layerDiagram() {
  const rows = grouped(Object.keys(MAY_IMPORT)).map((name) => {
    const members = GROUPS[name] ?? [name];
    const imports = MAY_IMPORT[members[0]];
    const allowed = grouped(imports.filter((other) => !members.includes(other)));
    const amongThemselves = members.length > 1 && members.every((m) => imports.includes(m));
    const all = amongThemselves ? [...allowed, "one another"] : allowed;
    return [name, all.length === 0 ? "—" : all.join(", ")];
  });
  rows.push(["app", "all of them"]);
  const lines = rows.map(([name, may]) => `${name.padEnd(15)} ← ${may}`);
  const groups = Object.entries(GROUPS).map(([name, members]) => `${name}: ${members.join(", ")}`);
  return [...lines, "", ...groups].join("\n");
}
