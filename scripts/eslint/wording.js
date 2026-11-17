// A local ESLint rule: what a component says is written in its package's
// wording module (or arrives in its view-model), never in the component
// itself. In the packages that draw it refuses text spelled out as JSX text
// (`<Button>Start set</Button>`) or given to a prop that labels
// (`title="Delete day"`, `ariaLabel={"Rest"}`, `hint={`${n} sets`}`), a
// conditional between such strings included. Punctuation and symbols alone
// (`·`, `−`, `×`) are not words.

/** The packages whose components draw. */
const WORDED_ELSEWHERE = [
  "design-system",
  "bodymap",
  "shell",
  "today",
  "planner",
  "progress",
  "modals",
];

/** Props that put words in front of the user. */
const LABEL_PROP =
  /^(aria-label|aria-description|aria-valuetext|alt|placeholder|title|subtitle|eyebrow|label|hint|caption|heading|text|message|tag)$|(Label|Title|Text|Hint)$/;

/** Text with a letter in it: words, not punctuation. */
const hasWords = (text) => /\p{L}/u.test(text);

/** The string pieces an expression spells out: literals, template text, either side of a choice. */
function spelled(node) {
  switch (node?.type) {
    case "Literal":
      return typeof node.value === "string" ? [node.value] : [];
    case "TemplateLiteral":
      return node.quasis.map((quasi) => quasi.value.cooked ?? "");
    case "ConditionalExpression":
      return [...spelled(node.consequent), ...spelled(node.alternate)];
    case "LogicalExpression":
      return [...spelled(node.left), ...spelled(node.right)];
    case "JSXExpressionContainer":
      return spelled(node.expression);
    default:
      return [];
  }
}

/** @type {import("eslint").Rule.RuleModule} */
export const noLiteralWording = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      literal:
        "Words shown to the user live in the package's wording module (or the view-model), not in a component.",
    },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: "literal" });
    return {
      JSXText(node) {
        if (hasWords(node.value)) report(node);
      },
      "JSXElement > JSXExpressionContainer"(node) {
        if (spelled(node).some(hasWords)) report(node);
      },
      JSXAttribute(node) {
        const name = node.name.type === "JSXNamespacedName" ? node.name.name.name : node.name.name;
        if (LABEL_PROP.test(name) && spelled(node.value).some(hasWords)) report(node);
      },
    };
  },
};

/** The rule, on in every component of the packages that draw. */
export const wordingRules = {
  files: WORDED_ELSEWHERE.map((name) => `packages/${name}/src/**/*.tsx`),
  plugins: { "nabd-wording": { rules: { "no-literal-wording": noLiteralWording } } },
  rules: { "nabd-wording/no-literal-wording": "error" },
};
