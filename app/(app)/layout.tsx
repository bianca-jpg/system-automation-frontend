import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/widgets/app-shell";
import { AppDataProvider } from "@/features/pedidos/model/app-data-provider";
import { RealtimeProvider } from "@/features/realtime";
import { QueryProvider } from "@/shared/providers/QueryProvider";
import {
  SIDEBAR_COLLAPSED_COOKIE,
  SidebarProvider,
} from "@/shared/providers/sidebar-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Lê a preferência da sidebar no servidor para o HTML já sair recolhido ou
  // expandido. Sem isso a sidebar renderiza expandida e recolhe depois da
  // hidratação, piscando a cada reload.
  const cookieStore = await cookies();
  const defaultCollapsed =
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "true";

  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      <QueryProvider>
        <RealtimeProvider>
          <AppDataProvider>
            <AppShell>{children}</AppShell>
          </AppDataProvider>
        </RealtimeProvider>
      </QueryProvider>
    </SidebarProvider>
  );
}
