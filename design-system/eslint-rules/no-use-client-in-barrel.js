/**
 * @fileoverview Forbid `"use client"` directive in barrel files (D-uc-02).
 *               Barrel = file whose body contains ONLY re-export statements
 *               (and optionally directives like "use client").
 *
 *               Phase 34: warn-mode. Phase 38 (FE-QUAL-06): error-mode.
 *
 * @author DS Team — Phase 34 DS Foundation, Plan 34-5
 *                     Phase 38 Plan 38-2: relocated to @system-automation/eslint-config/eslint-rules
 */

const BARREL_FILE_NAMES = new Set([
  "index.ts",
  "index.tsx",
  "components.ts",
  "components.tsx",
]);

const isBarrelFilename = (filename) => {
  const base = filename.split(/[\\/]/).pop() ?? "";
  return BARREL_FILE_NAMES.has(base);
};

const isPureReExportProgram = (body) =>
  body.every(
    (node) =>
      node.type === "ExportAllDeclaration" ||
      node.type === "ExportNamedDeclaration" ||
      (node.type === "ExpressionStatement" &&
        node.expression.type === "Literal" &&
        typeof node.expression.value === "string")
  );

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid 'use client' directive at top of barrel files (index.ts, components.ts).",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      forbidden:
        "'use client' directive is not allowed in barrel files. Move it to leaf components that need browser-only APIs.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!isBarrelFilename(filename)) {
      return {};
    }

    return {
      Program(node) {
        if (!isPureReExportProgram(node.body)) {
          return;
        }

        const directive = node.body.find(
          (n) =>
            n.type === "ExpressionStatement" &&
            n.expression.type === "Literal" &&
            n.expression.value === "use client"
        );

        if (directive) {
          context.report({
            node: directive,
            messageId: "forbidden",
            fix: (fixer) => fixer.remove(directive),
          });
        }
      },
    };
  },
};
