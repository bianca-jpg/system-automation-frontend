/**
 * @fileoverview Cap cva compoundVariants at 8 entries per component (D-cva-03).
 *               Walks CallExpression with callee.name === 'cva', counts
 *               elements in the second argument's `compoundVariants` array.
 *
 *               Rationale: >8 compoundVariants entries explodes the type
 *               permutation space, slows TS server, and signals confused
 *               variant matrix. Refactor: collapse overlapping entries,
 *               split into 2 cva() calls, or use CSS data-attributes
 *               (`[data-tone=success]:bg-success`).
 *
 *               Phase 34: warn-mode. Phase 38 (FE-QUAL-06): error-mode.
 *
 * @author DS Team — Phase 34 DS Foundation, Plan 34-5
 *                     Phase 38 Plan 38-2: relocated to @system-automation/eslint-config/eslint-rules
 */

const MAX_ENTRIES = 8;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cap cva compoundVariants at 8 entries per component to keep TS server fast (D-cva-03).",
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: { max: { type: "integer", minimum: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyCompounds:
        "cva() has {{count}} compoundVariants entries — cap is {{max}} per D-cva-03. Refactor: collapse overlapping entries, split into 2 cva() calls, or simplify the variant matrix.",
    },
  },
  create(context) {
    const max = (context.options[0] && context.options[0].max) ?? MAX_ENTRIES;

    return {
      "CallExpression[callee.name='cva']"(node) {
        if (node.arguments.length < 2) return;
        const opts = node.arguments[1];
        if (!opts || opts.type !== "ObjectExpression") return;

        const compoundProp = opts.properties.find(
          (p) =>
            p.type === "Property" &&
            !p.computed &&
            ((p.key.type === "Identifier" &&
              p.key.name === "compoundVariants") ||
              (p.key.type === "Literal" &&
                p.key.value === "compoundVariants"))
        );
        if (!compoundProp || compoundProp.value.type !== "ArrayExpression") {
          return;
        }

        const entriesCount = compoundProp.value.elements.filter(
          (e) => e !== null
        ).length;

        if (entriesCount > max) {
          context.report({
            node: compoundProp,
            messageId: "tooManyCompounds",
            data: { count: String(entriesCount), max: String(max) },
          });
        }
      },
    };
  },
};
