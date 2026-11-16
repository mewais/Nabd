import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { layerRules } from "./scripts/eslint/layers.js";
import { oneImportPerModule } from "./scripts/eslint/one-import-per-module.js";
import { stylingRules } from "./scripts/eslint/styling.js";
import { wordingRules } from "./scripts/eslint/wording.js";

/** Refused in every file: a type imported inline. */
const RESTRICTED_SYNTAX = [
  {
    selector: "ImportSpecifier[importKind='type']",
    message: "Import types with a separate `import type { … }` statement.",
  },
];

export default [
  {
    ignores: [
      "**/dist/**",
      "coverage/**",
      "**/target/**",
      "**/node_modules/**",
      "e2e/test-results/**",
      "e2e/visual/test-results/**",
      "packages/bodymap/src/drawing/bodydata.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
      nabd: { rules: { "one-import-per-module": oneImportPerModule } },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript itself reports undefined names (and knows the DOM + test globals).
      "no-undef": "off",
      // Props are typed with TypeScript, not PropTypes.
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // One import style: types come in their own `import type` statement, and
      // a module is imported once per kind.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX],
      "nabd/one-import-per-module": "error",
    },
    settings: { react: { version: "detect" } },
  },
  // The dependency direction between packages (README, "Layout").
  ...layerRules,
  // Styling lives in the design system (README, "Layout").
  stylingRules(RESTRICTED_SYNTAX),
  // Words live in wording modules and view-models, not in components (README, "Layout").
  wordingRules,
  {
    // Node scripts: the globals Node gives every module that they use.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: Object.fromEntries(
        [
          "console",
          "fetch",
          "process",
          "URL",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
        ].map((name) => [name, "readonly"]),
      ),
    },
  },
];
