// Standalone Design System ESLint config.
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dsCustomRules = require("./eslint-rules");

const palettePattern =
  "^(bg|text|border|ring|outline)-(red|blue|green|yellow|amber|orange|gray|zinc|slate|stone|neutral|emerald|sky|rose|indigo|violet|purple|fuchsia|pink|teal|cyan|lime)-\\d+$";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "storybook-static/**",
      "dist/**",
      ".storybook/**",
      "eslint-rules/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "better-tailwindcss": betterTailwindcss,
      "import-x": importX,
      "aramis-ds": dsCustomRules,
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "./globals.css",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "prefer-const": "error",
      "react-hooks/exhaustive-deps": "off",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: palettePattern,
              message:
                "Use semantic DS tokens (e.g. bg-destructive, text-info) instead of palette default.",
            },
          ],
        },
      ],
      "import-x/no-cycle": "error",
      "import-x/no-self-import": "error",
      "aramis-ds/no-use-client-in-barrel": "error",
      "aramis-ds/cva-max-axes": ["error", { max: 4 }],
      "aramis-ds/cva-max-compound-variants": ["error", { max: 8 }],
      "aramis-ds/no-form-frankenstein": "error",
    },
  },
];
