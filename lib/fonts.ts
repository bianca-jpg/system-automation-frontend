import localFont from "next/font/local";

/**
 * Adaptador de carregamento de fonte do app.
 *
 * O design system é dono de `--font-sans` / `--font-heading` e das fallbacks
 * (`tokens/typography.css`); o binário da fonte fica no app. O contrato
 * compartilhado é de três pesos estáticos — 400 / 500 / 700. Não existe eixo
 * variável: pesos fora dessa lista caem em síntese do navegador.
 *
 * `next/font/local` injeta `--font-satoshi`, faz preload dos .woff2 e calcula
 * as métricas da fallback, eliminando FOUT/CLS na troca da fonte.
 */
export const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/satoshi-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/satoshi-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/satoshi-bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
