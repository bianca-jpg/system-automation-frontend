"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface SidebarContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/**
 * A preferência vive em COOKIE, não em localStorage, porque o servidor precisa
 * lê-la para já renderizar a sidebar no estado certo. Com localStorage o HTML
 * do servidor sairia sempre expandido e a sidebar recolheria só depois da
 * hidratação — o "abre e fecha" a cada reload.
 *
 * O nome da chave acompanha o manager do Ara, que resolve isso do mesmo jeito.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar:collapsed";

const CHANGE_EVENT = "sidebar-change";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function readCollapsedCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${SIDEBAR_COLLAPSED_COOKIE}=true`);
}

function persist(collapsed: boolean) {
  // `SameSite=Lax` é suficiente: é preferência de UI, não credencial. Sem
  // `Secure` para continuar funcionando em http://localhost no dev.
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface SidebarProviderProps {
  children: ReactNode;
  /**
   * Valor lido do cookie no servidor. É o que o servidor e o PRIMEIRO render do
   * cliente usam — por isso não há divergência de hidratação nem flash.
   */
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const getServerSnapshot = useCallback(() => defaultCollapsed, [defaultCollapsed]);

  const isSidebarCollapsed = useSyncExternalStore(
    subscribe,
    readCollapsedCookie,
    getServerSnapshot,
  );

  const toggleSidebar = useCallback(() => {
    persist(!readCollapsedCookie());
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isSidebarCollapsed, toggleSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
