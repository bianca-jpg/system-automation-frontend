/**
 * @fileoverview Cap cva variants at 4 axes per component (D-cva-02).
 *               Walks CallExpression with callee.name === 'cva', counts keys
 *               in the second argument's `variants` ObjectExpression.
 *
 *               Rationale: >4 axes is a red flag of TS server slowness
 *               (>5s LSP latency) and confusing API. Refactor: split into
 *               2 cva() calls or extract sub-component (<ButtonGroup>,
 *               <IconButton>).
 *
 *               Phase 34: warn-mode. Phase 38 (FE-QUAL-06): error-mode.
 *
 * @author DS Team — Phase 34 DS Foundation, Plan 34-5
 *                     Phase 38 Plan 38-2: relocated to @system-automation/eslint-config/eslint-rules
 */

const MAX_AXES = 4;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cap cva variants at 4 axes per component to keep TS server fast and API simple (D-cva-02).",
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
      tooManyAxes:
        "cva() has {{count}} axes — cap is {{max}} per D-cva-02. Split into 2 cva() calls or simplify the variant matrix.",
    },
  },
  create(context) {
    const max = (context.options[0] && context.options[0].max) ?? MAX_AXES;

    return {
      "CallExpression[callee.name='cva']"(node) {
        // cva(base, options) — options is the 2nd argument
        if (node.arguments.length < 2) return;
        const opts = node.arguments[1];
        if (!opts || opts.type !== "ObjectExpression") return;

        // Find the `variants` property
        const variantsProp = opts.properties.find(
          (p) =>
            p.type === "Property" &&
            !p.computed &&
            ((p.key.type === "Identifier" && p.key.name === "variants") ||
              (p.key.type === "Literal" && p.key.value === "variants"))
        );
        if (!variantsProp || variantsProp.value.type !== "ObjectExpression") {
          return;
        }

        // Count keys in the variants ObjectExpression
        const axesCount = variantsProp.value.properties.filter(
          (p) => p.type === "Property"
        ).length;

        if (axesCount > max) {
          context.report({
            node: variantsProp,
            messageId: "tooManyAxes",
            data: { count: String(axesCount), max: String(max) },
          });
        }
      },
    };
  },
};
