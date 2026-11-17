// A local ESLint rule: a module is imported by at most one `import` statement
// and one `import type` statement per file. (The core `no-duplicate-imports`
// cannot tell the two apart, and this code base keeps them apart on purpose.)

/** @type {import("eslint").Rule.RuleModule} */
export const oneImportPerModule = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      duplicate: "'{{source}}' is already imported above: merge this into that {{kind}}.",
    },
  },
  create(context) {
    const seen = new Set();
    return {
      ImportDeclaration(node) {
        const kind = node.importKind === "type" ? "`import type`" : "`import`";
        const key = `${kind} ${node.source.value}`;
        if (seen.has(key)) {
          context.report({
            node,
            messageId: "duplicate",
            data: { source: node.source.value, kind },
          });
        }
        seen.add(key);
      },
    };
  },
};
