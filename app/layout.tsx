import type { Metadata } from "next";
import {
  CentralThemeProvider,
  ThemeInitScript,
} from "@system-automation/design-system/components/providers";
import { auth } from "@/auth";
import { satoshi } from "@/lib/fonts";
import { APP_BRAND } from "@/shared/config/app-brand";
import { SessionProvider } from "@/shared/providers/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_BRAND.title,
  description: APP_BRAND.description,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="pt-BR" className={satoshi.variable} suppressHydrationWarning>
      <head>
        {/* Resolve modo (.light/.dark) e tema de cor (data-theme) antes da
            primeira pintura, evitando flash de tema. Vem do design system para
            que a chave de storage e o default fiquem iguais nos apps do projeto. */}
        <ThemeInitScript />
      </head>
      <body className="font-sans antialiased">
        {/* CentralThemeProvider já monta o Toaster do design system. */}
        <CentralThemeProvider>
          <SessionProvider session={session}>{children}</SessionProvider>
        </CentralThemeProvider>
      </body>
    </html>
  );
}
