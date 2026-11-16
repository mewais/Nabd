// Styling stays in the design system. Everywhere else that draws — the screens,
// the body map, the app — composes its primitives and names steps of its
// scales (`gap="md"`, `variant="hint"`, `tone="accent"`), so these are refused
// there:
//
//   - a `style` attribute (lay out with Row / Stack / Grid, set text with Text);
//   - a colour spelled out: `var(--…)`, `color-mix(…)`, `#hex`, `rgb(…)`;
//   - a numeric `fontSize`, `gap`, `padding` or `margin`;
//   - a raw <button>, <input>, <select> or <textarea>.
//
// A genuine one-off is disabled on its line, with the reason.

const STYLED_ELSEWHERE = ["bodymap", "shell", "today", "planner", "progress", "modals", "app"];

const RAW_COLOR = String.raw`/var\(--|color-mix\(|^#[0-9a-fA-F]{3,8}$|\brgba?\(|\boklch\(/`;
const SIZED = "/^(fontSize|gap|rowGap|columnGap|padding|margin)/";

const restrictions = [
  {
    selector: "JSXAttribute[name.name='style']",
    message:
      "No inline styles outside the design system: compose its primitives (Row, Stack, Grid, Text, Card…).",
  },
  {
    selector: `Literal[value=${RAW_COLOR}], TemplateElement[value.raw=${RAW_COLOR}]`,
    message: "Name colours through the design system (`tone`, or `COLOR`), never as raw CSS.",
  },
  {
    selector: `Property[key.name=${SIZED}] > Literal[raw=/^[0-9.]+$/]`,
    message: "Sizes and spacing come from the design system's scales, not from numbers.",
  },
  {
    selector: "JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]",
    message: "Use the design system's controls (Button, IconButton, RowButton, TextInput…).",
  },
];

/**
 * The config block that holds the non-design-system packages to the rules
 * above. `base` is what `no-restricted-syntax` already refuses everywhere:
 * the rule's options are replaced, not merged, so they are repeated here.
 */
export function stylingRules(base) {
  return {
    files: STYLED_ELSEWHERE.map((name) => `packages/${name}/**/*.{ts,tsx}`),
    rules: { "no-restricted-syntax": ["error", ...base, ...restrictions] },
  };
}
