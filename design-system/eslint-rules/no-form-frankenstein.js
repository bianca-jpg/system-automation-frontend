/**
 * @fileoverview Forbid imports of FormInput AND FormSelect Frankenstein components from @system-automation/design-system.
 *               D-form-01 (FormInput) + D-form-02 (FormSelect): warn-mode in Phase 35; promoted to error in Phase 38 (FE-QUAL-21 cleanup).
 *               Both follow the same anti-pattern: monolithic component mixing label + RHF + error display in a single non-composable surface.
 *               Migration target: <Form> + <FormField> from components/form/ (shadcn-style over RHF + zod), composed with <Input> or <Select> from components/ui/.
 *
 * @author DS Team — Phase 35 DS Components Refactor, Plan 35-6
 *                     Phase 38 Plan 38-2: relocated to @system-automation/eslint-config/eslint-rules
 */

const FRANKENSTEIN_SOURCES = new Set([
  "@system-automation/design-system/components/input",
  "@system-automation/design-system/components/select",
  "@system-automation/design-system/components",
]);

const FRANKENSTEIN_NAMES = new Set(["FormInput", "FormSelect"]);

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Forbid imports of FormInput and FormSelect from @system-automation/design-system. Migrate to <Form> + <FormField> from components/form (composed with <Input> or <Select>).",
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      forbiddenFormInput:
        "FormInput is deprecated (D-form-01). Use <Form> + <FormField> from @system-automation/design-system/components/form (shadcn-style over RHF + zod), composed with <Input>. See frontend-conventions.md §0.D.",
      forbiddenFormSelect:
        "FormSelect is deprecated (D-form-02). Use <Form> + <FormField> from @system-automation/design-system/components/form, composed with <Select> from @system-automation/design-system/components/ui/select. See frontend-conventions.md §0.D.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!FRANKENSTEIN_SOURCES.has(node.source.value)) {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          const name = specifier.imported.name;
          if (!FRANKENSTEIN_NAMES.has(name)) continue;
          context.report({
            node: specifier,
            messageId:
              name === "FormInput" ? "forbiddenFormInput" : "forbiddenFormSelect",
          });
        }
      },
    };
  },
};
