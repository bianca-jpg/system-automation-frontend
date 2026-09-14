"use client";

import type { ReactNode } from "react";
import { useApiSession } from "@/shared/hooks/useApiSession";
import { SkipLink } from "@/shared/ui/primitives/skip-link";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  useApiSession();

  return (
    // Shell em flexbox: a sidebar é irmã do <main>, não um `fixed` com offset
    // calculado à mão. Recolher a sidebar muda só a largura da <aside> e o
    // conteúdo acompanha sozinho.
    <div className="flex h-dvh min-h-0 max-w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Atalho de teclado para pular a sidebar inteira e cair no conteúdo. */}
      <SkipLink />

      <AppSidebar />

      {/* `pt-14` só no mobile: ali a sidebar traz um header fixo de 56px; no
          desktop não existe barra superior. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-background pt-14 md:pt-0"
      >
        {children}
      </main>
    </div>
  );
}
