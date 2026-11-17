// The local ESLint rules (scripts/eslint/), so that what the README says they
// refuse stays refused.

import { readFileSync } from "node:fs";
import { RuleTester } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import tsparser from "@typescript-eslint/parser";
import {
  MAY_IMPORT,
  PAST_THE_ENTRY_POINT,
  layerDiagram,
  restrictionsOf,
} from "../../scripts/eslint/layers.js";
import { oneImportPerModule } from "../../scripts/eslint/one-import-per-module.js";
import { stylingRestrictions } from "../../scripts/eslint/styling.js";
import { noLiteralWording } from "../../scripts/eslint/wording.js";

const tester = new RuleTester({
  languageOptions: {
    parser: tsparser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  },
});

function builtin(name: string) {
  const rule = builtinRules.get(name);
  if (!rule) throw new Error(`ESLint has no rule ${name}`);
  return rule;
}

/** Code the styling rule lets through. */
const allowed = (code: string) => ({ code, options: stylingRestrictions });
/** A probe the styling rule must refuse, `errors` times. */
const refused = (code: string, errors = 1) => ({
  code,
  options: stylingRestrictions,
  errors,
});

describe("styling (no-restricted-syntax outside the design system)", () => {
  tester.run("styling", builtin("no-restricted-syntax"), {
    valid: [
      allowed('const a = <Row gap="md" padding="lg"><Text tone="accent">x</Text></Row>;'),
      allowed('const b = <Grid columns={["badge", { min: "tile" }, "badge"]} rows="fill" />;'),
      allowed('const c = <Icon name="plus" size="sm" weight="heavy" />;'),
      allowed('const d = { title: "Rest 1:30", share: `${pct}%`, label: "8 × 25 kg" };'),
      allowed('const e = <svg fill="none" stroke="currentColor" />;'),
      allowed("const f = <Button onClick={go}>Go</Button>;"),
    ],
    invalid: [
      refused("const a = <div style={{}} />;"),
      refused("const a = <div {...{ style: {} }} />;"),
      refused('const a = { padding: "8px" };', 2),
      refused('const a = { "fontSize": 12 };'),
      refused("const a = { gap: -4 };"),
      refused("const a = { borderRadius: 6, width: 300 };", 2),
      refused('const a = { color: "red" };'),
      refused('const a = <svg fill="red" />;'),
      refused('const a = { background: "var(--bg)" };', 2),
      refused('const a = "#e05252";'),
      refused('const a = <Grid columns="250px minmax(0, 1fr)" />;'),
      refused('const a = "repeat(auto-fill, 150px)";'),
      refused("const a = <Icon size={14} />;"),
      refused("const a = <ModalShell width={540} />;"),
      refused("const a = <a onClick={go}>x</a>;"),
      refused("const a = <div onClick={go} />;"),
      refused("const a = <button />;"),
      refused("const a = <input />;"),
    ],
  });
});

describe("no-literal-wording (in the packages that draw)", () => {
  const refused = (code: string) => ({ code, errors: 1 });
  tester.run("no-literal-wording", noLiteralWording, {
    valid: [
      "const a = <Button onClick={go}>{WORDS.startSet}</Button>;",
      'const b = <Card title={WORDS.coverage} padding="lg" />;',
      'const c = <Icon name="plus" size="sm" />;',
      "const d = <Text>{vm.label} · {vm.detail}</Text>;",
      'const e = <Row>{" "}·{" "}−</Row>;',
      "const f = <Stepper ariaLabel={stepLabel(1, name)} />;",
      'const g = { title: "Rest 1:30" };',
    ],
    invalid: [
      refused("const a = <Button>Start set</Button>;"),
      refused('const a = <Text>{"Let\'s go"}</Text>;'),
      refused('const a = <Card title="Weekly coverage" />;'),
      refused('const a = <TextInput placeholder="Search…" />;'),
      refused('const a = <IconButton ariaLabel="Close" />;'),
      refused('const a = <div aria-label="Nabd" />;'),
      refused("const a = <Stepper ariaLabel={`Decrease ${name}`} />;"),
      refused('const a = <Button title={on ? "Pause" : vm.title} />;'),
    ],
  });
});

describe("layers (no-restricted-imports per package)", () => {
  const options = (name: string) => [
    { paths: restrictionsOf(name), patterns: PAST_THE_ENTRY_POINT },
  ];
  const from = (name: string, code: string) => ({ code, options: options(name) });
  const refusedFrom = (name: string, code: string) => ({ ...from(name, code), errors: 1 });

  tester.run("layers", builtin("no-restricted-imports"), {
    valid: [
      from("today", 'import { x } from "@nabd/design-system";'),
      from("today", 'import { x } from "./queue-vm";'),
      from("modals", 'import { x } from "../options";'),
      from("store", 'import { x } from "@nabd/scheduling";'),
      from("app", 'import { x } from "@nabd/store";'),
      from("app", 'import prepaint from "@nabd/design-system/prepaint.json";'),
    ],
    invalid: [
      refusedFrom("today", 'import { x } from "@nabd/store";'),
      refusedFrom("today", 'import { x } from "../../store/src/store";'),
      refusedFrom("modals", 'import { x } from "../../../store/src/store";'),
      refusedFrom("app", 'import { x } from "../design-system/src/theme";'),
      refusedFrom("today", 'import { x } from "@nabd/design-system/src/text";'),
      refusedFrom("scheduling", 'import { x } from "@nabd/view";'),
      refusedFrom("domain", 'import React from "react";'),
      refusedFrom("today", 'import { create } from "zustand";'),
    ],
  });
});

describe("one-import-per-module", () => {
  tester.run("one-import-per-module", oneImportPerModule, {
    valid: ['import { a } from "x";\nimport type { B } from "x";'],
    invalid: [{ code: 'import { a } from "x";\nimport { b } from "x";', errors: 1 }],
  });
});

describe("the packages' manifests", () => {
  const root = new URL("../../packages/", import.meta.url);

  it.each(Object.entries(MAY_IMPORT))(
    "@nabd/%s declares only the workspace packages its layer may import",
    (name, allowed) => {
      const manifest = JSON.parse(readFileSync(new URL(`${name}/package.json`, root), "utf8"));
      const declared = Object.keys(manifest.dependencies ?? {})
        .filter((dependency) => dependency.startsWith("@nabd/"))
        .map((dependency) => dependency.slice("@nabd/".length));
      expect(declared.filter((dependency) => !allowed.includes(dependency))).toEqual([]);
    },
  );
});

describe("the README", () => {
  it("draws the dependency graph the layer rules enforce", () => {
    const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
    expect(readme).toContain(layerDiagram());
  });
});
