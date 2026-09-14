import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Permite parâmetros/variáveis intencionalmente não usados com prefixo "_"
  // (convenção padrão — útil para stubs e assinaturas que ainda serão implementadas).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees do Claude Code (.claude/worktrees/<nome>) são cópias do repo numa
    // outra branch. Lintá-las duplica todo o projeto no relatório e mistura
    // problemas de outra branch com os do código atual.
    ".claude/worktrees/**",
    // design-system é consumido apenas como base de padronização visual (pacote
    // local file:./design-system) e tem seu próprio eslint.config.mjs; não faz
    // parte do código da aplicação.
    "design-system/**",
  ]),
]);

export default eslintConfig;
