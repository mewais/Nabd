// Styling stays in the design system. Everywhere else that draws — the screens,
// the body map, the app — composes its primitives and names steps of its
// scales (`gap="md"`, `variant="hint"`, `tone="accent"`, `size="sm"`,
// `columns={["badge", 1]}`), so these are refused there:
//
//   - a `style` attribute, given directly or through a spread object (lay out
//     with Row / Stack / Grid, set text with Text);
//   - a colour spelled out: `var(--…)`, `color-mix(…)`, `#hex`, `rgb(…)`,
//     `oklch(…)`, or any word given to a colour property or attribute
//     (`color: "red"`, `fill="red"`);
//   - a CSS length, track list or function in a string: "8px", "1.5fr",
//     "minmax(0, 1fr)", "repeat(…)", "calc(…)";
//   - a size, spacing, radius, weight or position given as a number or a
//     string to a style property (`gap: 4`, `"fontSize": 12`, `gap: -4`,
//     `borderRadius: 6`, `width: 300`), or as a number to a sizing attribute
//     (`width={540}`, `size={14}`);
//   - a raw <button>, <input>, <select> or <textarea>, and any other element
//     made clickable with `onClick` (`<a onClick>`, `<div onClick>`).
//
// A genuine one-off is disabled on its line, with the reason.

const STYLED_ELSEWHERE = ["bodymap", "shell", "today", "planner", "progress", "modals", "app"];

const RAW_COLOR = String.raw`/var\(--|color-mix\(|^#[0-9a-fA-F]{3,8}$|\brgba?\(|\b(ok)?l(ch|ab)\(|\bhsla?\(/`;
const CSS_STRING = String.raw`/\d(px|fr|rem|vh|vw)\b|\b(minmax|repeat|calc|clamp)\(/`;

/** Style properties that take a size, a spacing, a radius, a weight or a position. */
const SIZED_KEYS = [
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "gap",
  "rowGap",
  "columnGap",
  "padding\\w*",
  "margin\\w*",
  "border\\w*",
  "width",
  "height",
  "(min|max)(Width|Height)",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "opacity",
  "zIndex",
];
const SIZED = `/^(${SIZED_KEYS.join("|")})$/`;
/** Properties and attributes that take a colour. */
const COLORED =
  "/^(color|background|backgroundColor|borderColor|fill|stroke|stopColor|outlineColor)$/";
/** The words a colour property may still take: none, or what the element already has. */
const NOT_A_COLOR = "/^(none|transparent|currentColor|inherit)$/";
/** Attributes that size an element. */
const SIZING_ATTRIBUTE = "/^(size|width|height|fontSize|strokeWidth|r|rx|ry)$/";

/** A property whose key, written as a name (`gap:`) or quoted (`"gap":`), matches `pattern`. */
const keyMatching = (pattern) => `Property:matches([key.name=${pattern}], [key.value=${pattern}])`;
/** A number, possibly signed, or a string: what a sized style property may not be given. */
const LITERAL_VALUE = "[value.type=/^(Literal|UnaryExpression|TemplateLiteral)$/]";

const restrictions = [
  {
    selector:
      "JSXAttribute[name.name='style'], JSXSpreadAttribute > ObjectExpression > Property[key.name='style']",
    message:
      "No inline styles outside the design system: compose its primitives (Row, Stack, Grid, Text, Card…).",
  },
  {
    selector: `Literal[value=${RAW_COLOR}], TemplateElement[value.raw=${RAW_COLOR}]`,
    message: "Name colours through the design system (`tone`, or `COLOR`), never as raw CSS.",
  },
  {
    selector: `${keyMatching(COLORED)}[value.type='Literal'][value.value!=${NOT_A_COLOR}], JSXAttribute[name.name=${COLORED}] > Literal[value!=${NOT_A_COLOR}]`,
    message: "Name colours through the design system (`tone`, or `COLOR`), never as raw CSS.",
  },
  {
    selector: `Literal[value=${CSS_STRING}], TemplateElement[value.raw=${CSS_STRING}]`,
    message:
      "No CSS lengths or track lists outside the design system: name a size, a width (`WIDTH`) or a Grid track.",
  },
  {
    selector: `${keyMatching(SIZED)}${LITERAL_VALUE}`,
    message: "Sizes and spacing come from the design system's scales, not from numbers.",
  },
  {
    selector: `JSXAttribute[name.name=${SIZING_ATTRIBUTE}] > JSXExpressionContainer > :matches(Literal[raw=/^[0-9.]/], UnaryExpression), JSXAttribute[name.name=${SIZING_ATTRIBUTE}] > Literal[value=/^[0-9.]/]`,
    message: 'Sizes come from the design system\'s scales (`size="sm"`), not from numbers.',
  },
  {
    selector: "JSXOpeningElement[name.name=/^(button|input|select|textarea)$/]",
    message: "Use the design system's controls (Button, IconButton, RowButton, TextInput…).",
  },
  {
    selector:
      "JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name=/^on(Click|KeyDown|KeyUp|MouseDown|MouseUp)$/]",
    message:
      "Only a control reacts to the pointer and the keyboard: use the design system's (Button, RowButton…).",
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
    rules: { "no-restricted-syntax": ["error", ...base, ...stylingRestrictions] },
  };
}

/** What the styling rule refuses, as `no-restricted-syntax` options (exported for its tests). */
export const stylingRestrictions = restrictions;
