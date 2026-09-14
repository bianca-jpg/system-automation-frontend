import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    // design-system é consumido apenas como base de padronização visual (pacote local
    // file:./design-system); seus próprios testes/config vivem em design-system/vitest.config.ts
    // e não fazem parte da suíte da aplicação.
    exclude: ["**/node_modules/**", "**/.next/**", "design-system/**"],
    globals: true,
  },
});
