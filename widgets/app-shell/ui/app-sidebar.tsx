"use client";

import { useCallback, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sliders,
  User,
  Users,
  X,
} from "@/shared/ui/icons";
import { pathToSection, routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { iniciaisDoNome } from "@/shared/lib/iniciais";
import { Button } from "@/shared/ui/primitives/button";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/primitives/dropdown-menu";
import { IconCountBadge } from "@/shared/ui/primitives/icon-count-badge";
import { Separator } from "@/shared/ui/primitives/separator";
import { ThemeIconToggle } from "@/shared/ui/primitives/theme-toggle";
import { Can } from "@/shared/config/auth/permissions";
import { ROLE_LEVEL } from "@/shared/config/auth/automation-roles";
import { useRealtime } from "@/features/realtime";
import { useSidebar } from "@/shared/providers/sidebar-context";
import { SettingsModal } from "@/features/preferences";
import { useAccessibleMobileSidebar } from "../lib/use-accessible-mobile-sidebar";
import { useHasHydrated } from "../lib/use-has-hydrated";
import {
  SIDEBAR_PRESS_STATE_CLASS,
  SIDEBAR_SECTION_GAP_CLASS,
  SIDEBAR_STACK_SPACING_CLASS,
  SidebarIconLogo,
  SidebarSectionToggle,
  SidebarWordmark,
} from "./sidebar-shared";

export function AppSidebar() {
  const pathname = usePathname();
  const activeSection = pathToSection(pathname);

  const { isSidebarCollapsed: isCollapsed, toggleSidebar } = useSidebar();
  const { data: session } = useSession();
  const { clearPersistedState, unseenTopics } = useRealtime();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuSectionOpen, setMenuSectionOpen] = useState(true);
  const [adminSectionOpen, setAdminSectionOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Nome e papel vêm da sessão, que só existe no cliente. Renderizá-los no
  // primeiro passe faria o HTML do servidor divergir do cliente — por isso o
  // menu do usuário só monta depois da hidratação.
  const hasHydrated = useHasHydrated();

  const { dialogRef, isMobileViewport, triggerRef } =
    useAccessibleMobileSidebar({
      open: isMobileMenuOpen,
      onOpenChange: setIsMobileMenuOpen,
    });

  const user = session?.user;
  const displayName = user?.name || user?.email || "Usuário";
  const roleTitle = user?.roleTitle;

  // No mobile a sidebar abre por cima em largura cheia: mesmo com a preferência
  // "recolhida" salva, ali ela mostra rótulos.
  const isIconOnly = isCollapsed && !isMobileMenuOpen;

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const handleSignOut = useCallback(() => {
    clearPersistedState();
    void signOut({ callbackUrl: routes.login });
  }, [clearPersistedState]);

  const userMenuContent = (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)}>
        <Settings className="h-4 w-4" />
        <span>Configurações</span>
      </DropdownMenuItem>
      <Separator />
      <DropdownMenuItem onSelect={handleSignOut}>
        <LogOut className="h-4 w-4" />
        <span>Sair</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const desktopUserMenuContainerClassName = cn(
    "hidden border-t ds-border-divider md:block",
    isCollapsed ? "px-2 py-2.5" : "p-3",
  );
  const desktopUserMenuTriggerClassName = cn(
    SIDEBAR_PRESS_STATE_CLASS,
    "text-sidebar-foreground",
    isCollapsed
      ? "mx-auto h-10 w-10 flex-none justify-center rounded-full border ds-border-transparent px-0 hover:bg-hover-soft hover:text-foreground"
      : "mx-1 h-10 w-[calc(100%-0.5rem)] justify-start rounded-[var(--radius-card)] px-3 hover:bg-hover-soft hover:text-foreground",
  );

  return (
    <>
      {/* Header mobile — o desktop NÃO tem barra superior (padrão do manager):
          tudo o que ela traria vive no rodapé da sidebar. */}
      <header
        className="fixed inset-x-0 top-0 z-navigation flex h-14 items-center justify-between border-b ds-border-divider bg-sidebar/80 px-4 backdrop-blur-md md:hidden"
        inert={isMobileMenuOpen ? true : undefined}
      >
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="app-mobile-navigation"
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1">
          <ThemeIconToggle className="h-10 w-10" />

          {hasHydrated ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Abrir menu de ${displayName}`}
                  className="h-10 w-10"
                >
                  <UserAvatar name={displayName} />
                </Button>
              </DropdownMenuTrigger>
              {userMenuContent}
            </DropdownMenu>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center">
              {/* Antes da hidratação não há sessão: sem nome, sem iniciais. */}
              <UserAvatar />
            </div>
          )}
        </div>
      </header>

      {/* Backdrop — só mobile. `bg-black/40` é o mesmo scrim do `DialogOverlay`
          do design system: um scrim é a única superfície que NÃO inverte com o
          tema (com `bg-foreground/50` ele virava um véu branco no escuro, que
          clareia a tela em vez de escurecê-la). Sem `backdrop-blur`: o filtro
          cobre a viewport inteira e é recomposto a cada frame enquanto o painel
          desliza, o que faz o overlay parecer "arrastar" em vez de aparecer em
          fade. */}
      <div
        data-mobile-sidebar-backdrop=""
        className={cn(
          "fixed inset-0 z-overlay bg-black/40 transition-opacity duration-[var(--motion-duration-standard)] motion-reduce:transition-none md:hidden",
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Sidebar — desktop: irmão flex do <main>; mobile: overlay pela esquerda */}
      <aside
        ref={dialogRef}
        id="app-mobile-navigation"
        role={isMobileViewport ? "dialog" : undefined}
        aria-modal={isMobileViewport && isMobileMenuOpen ? true : undefined}
        aria-label={isMobileViewport ? "Navegação principal" : undefined}
        aria-hidden={isMobileViewport && !isMobileMenuOpen ? true : undefined}
        inert={isMobileViewport && !isMobileMenuOpen ? true : undefined}
        className={cn(
          // transition-[transform,width] em vez de transition-all: só o slide
          // mobile e o colapso desktop devem animar.
          "relative flex h-dvh shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[transform,width] duration-[var(--motion-duration-standard)] motion-reduce:transition-none md:overflow-visible",
          "fixed left-0 top-0 z-modal w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-0 md:z-navigation md:translate-x-0 md:border-r md:ds-border-surface",
          isCollapsed ? "md:w-[4.5rem]" : "md:w-60",
        )}
      >
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden px-2">
          {/* Cabeçalho do painel mobile */}
          <div className="flex items-center justify-between px-2 pt-4 md:hidden">
            <SidebarWordmark />
            {/* `data-mobile-sidebar-initial-focus` é o contrato com o
                `useAccessibleMobileSidebar`: é por ele que o hook encontra o
                primeiro alvo de foco ao abrir o painel. */}
            <Button
              data-mobile-sidebar-initial-focus=""
              variant="ghost"
              size="icon"
              onClick={closeMobileMenu}
              aria-label="Fechar menu"
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Marca — desktop. Continua não-clicável (como antes): a wordmark e o
              logo-ícone fazem crossfade conforme a sidebar recolhe. */}
          <div className="relative my-4 hidden h-16 w-full items-center overflow-hidden rounded-control md:flex">
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex w-full items-center pl-3 transition-[opacity,transform] duration-[var(--motion-duration-standard)] ease-standard motion-reduce:transition-none",
                isCollapsed
                  ? "pointer-events-none -translate-x-5 opacity-0"
                  : "translate-x-0 opacity-100 delay-100",
              )}
            >
              <SidebarWordmark />
            </div>
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex w-full items-center justify-center transition-[opacity,transform] duration-[var(--motion-duration-standard)] ease-standard motion-reduce:transition-none",
                isCollapsed
                  ? "opacity-100 delay-100"
                  : "pointer-events-none opacity-0",
              )}
            >
              <SidebarIconLogo />
            </div>
          </div>

          {/* Recolher/expandir — desktop */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              SIDEBAR_PRESS_STATE_CLASS,
              "absolute right-[-0.875rem] top-16 z-popover hidden h-7 w-7 rounded-full border ds-border-surface bg-background p-0 shadow-popover hover:bg-hover-soft md:flex",
            )}
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>

          <nav
            aria-label="Navegação principal"
            className={cn(
              "-mr-2 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-4",
              isIconOnly ? "pr-0" : "pr-2",
            )}
          >
            <div className="flex min-w-0 flex-col">
              {!isIconOnly && (
                <SidebarSectionToggle
                  label="Menu"
                  expanded={menuSectionOpen}
                  onToggle={() => setMenuSectionOpen((open) => !open)}
                />
              )}

              {(menuSectionOpen || isIconOnly) && (
                // pb-2 cria 8px de folga abaixo do último item DENTRO deste
                // div — absorve o `active:translate-y-[0.5px]` do press sem
                // clipar o fundo nem disparar a barra de rolagem transiente.
                <div
                  className={cn(
                    SIDEBAR_STACK_SPACING_CLASS,
                    "min-w-0 overflow-x-hidden pb-2",
                    isIconOnly && "px-0",
                  )}
                >
                  <SidebarNavItem
                    href={routes.visaoGeral}
                    icon={LayoutDashboard}
                    label="Resumo Geral"
                    active={activeSection === "visao-geral"}
                    isIconOnly={isIconOnly}
                    onNavigate={closeMobileMenu}
                  />
                  <SidebarNavItem
                    href={routes.pedidos}
                    icon={FileText}
                    label="Pedidos"
                    active={activeSection === "pedidos"}
                    isIconOnly={isIconOnly}
                    hasUnseen={unseenTopics.orders}
                    badgeVariant="info"
                    onNavigate={closeMobileMenu}
                  />
                  <SidebarNavItem
                    href={routes.historico}
                    icon={History}
                    label="Histórico"
                    active={activeSection === "historico"}
                    isIconOnly={isIconOnly}
                    hasUnseen={unseenTopics.history}
                    onNavigate={closeMobileMenu}
                  />
                  <SidebarNavItem
                    href={routes.alertas}
                    icon={Bell}
                    label="Alertas"
                    active={activeSection === "alertas"}
                    isIconOnly={isIconOnly}
                    hasUnseen={
                      unseenTopics.alerts || unseenTopics.communications
                    }
                    badgeVariant="destructive"
                    onNavigate={closeMobileMenu}
                  />
                </div>
              )}
            </div>

            <div
              className={cn(
                SIDEBAR_SECTION_GAP_CLASS,
                "flex min-w-0 flex-col",
              )}
            >
              {!isIconOnly && (
                <SidebarSectionToggle
                  label="Administração"
                  expanded={adminSectionOpen}
                  onToggle={() => setAdminSectionOpen((open) => !open)}
                  className="shrink-0"
                />
              )}

              {(adminSectionOpen || isIconOnly) && (
                <div
                  className={cn(
                    SIDEBAR_STACK_SPACING_CLASS,
                    "min-w-0 overflow-x-hidden pb-2",
                    isIconOnly && "px-0",
                  )}
                >
                  <SidebarNavItem
                    href={routes.parametros}
                    icon={Sliders}
                    label="Parâmetros"
                    active={activeSection === "parametros"}
                    isIconOnly={isIconOnly}
                    onNavigate={closeMobileMenu}
                  />
                  <Can minLevel={ROLE_LEVEL.administrador}>
                    {/* Colado em Parâmetros de propósito: a tela decide
                        solicitações de parâmetro, então pertence a essa
                        vizinhança, e não ao bloco de usuários. */}
                    <SidebarNavItem
                      href={routes.configuracoesParametros}
                      icon={Settings}
                      label="Config. de Parâmetros"
                      active={activeSection === "configuracoes-parametros"}
                      isIconOnly={isIconOnly}
                      onNavigate={closeMobileMenu}
                    />
                    <SidebarNavItem
                      href={routes.usuarios}
                      icon={Users}
                      label="Gestão de Usuários"
                      active={activeSection === "usuarios"}
                      isIconOnly={isIconOnly}
                      onNavigate={closeMobileMenu}
                    />
                  </Can>
                </div>
              )}
            </div>
          </nav>

          {/* Menu do usuário no rodapé — só desktop (no mobile ele vive no
              header). */}
          <div className={desktopUserMenuContainerClassName}>
            {hasHydrated ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label={`Abrir menu de ${displayName}`}
                    title={!isCollapsed ? displayName : undefined}
                    className={desktopUserMenuTriggerClassName}
                  >
                    <UserAvatar name={displayName} />
                    {!isCollapsed && (
                      <span className="min-w-0 max-w-[8.25rem] flex-1 overflow-hidden text-left text-sm">
                        <span className="block truncate">{displayName}</span>
                        {/* Rótulo do papel embaixo do nome: diz o que a pessoa
                            É no sistema, não o que ela pode fazer. Só aparece
                            quando o backend manda — conta antiga que ainda não
                            relogou fica sem, e uma linha vazia seria pior que
                            nenhuma linha. */}
                        {roleTitle && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {roleTitle}
                          </span>
                        )}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                {userMenuContent}
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                disabled
                aria-label="Menu do usuário"
                className={desktopUserMenuTriggerClassName}
              >
                <UserAvatar />
                {!isCollapsed && (
                  <span className="min-w-0 max-w-[8.25rem] flex-1 overflow-hidden text-left text-sm">
                    <span className="block truncate">Usuário</span>
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </aside>

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}

// `Avatar`/`AvatarFallback` do design system: o `avatarVariants` já é
// `relative flex size-8 shrink-0 overflow-hidden rounded-full` — as medidas do
// <span> que existia aqui batem exatamente. Passar pelo componente também abre o
// caminho do `AvatarImage` quando a sessão trouxer foto do usuário.
/**
 * Avatar do usuário: iniciais do nome, com o ícone genérico como último
 * recurso.
 *
 * A escada de fallback existe porque o nome pode não estar disponível — conta
 * que ainda não relogou desde a migration 036 cai no e-mail, e de e-mail não
 * se extrai inicial que signifique algo ("victoria.mollica" viraria "V", que
 * diz menos que o bonequinho). Quando a foto do Graph entrar, ela vira o topo
 * desta escada via `AvatarImage`, e as iniciais seguem valendo para quem não
 * tiver foto cadastrada.
 */
function UserAvatar({ name }: { name?: string }) {
  const iniciais = iniciaisDoNome(name?.includes("@") ? null : name);

  return (
    <Avatar className="border ds-border-surface">
      <AvatarFallback className="bg-background text-foreground">
        {iniciais ? (
          <span className="text-xs font-semibold leading-none">{iniciais}</span>
        ) : (
          <User className="h-4 w-4" aria-hidden />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  active,
  isIconOnly,
  hasUnseen,
  badgeVariant = "info",
  onNavigate,
}: {
  href: string;
  icon: ElementType;
  label: string;
  active?: boolean;
  isIconOnly: boolean;
  hasUnseen?: boolean;
  badgeVariant?: "info" | "destructive";
  onNavigate?: () => void;
}) {
  return (
    // `Button asChild` é a API pública do design system para "um Link com
    // aparência de botão" (Radix `Slot`). Antes o `buttonVariants` era chamado à
    // mão sobre o `<Link>` — as classes CVA não fazem parte da API pública do
    // pacote (mesma decisão registrada em `badge.tsx` e `pressable.tsx`).
    <Button
      asChild
      variant="ghost"
      className={cn(
        SIDEBAR_PRESS_STATE_CLASS,
        "flex h-10 items-center py-0 text-sidebar-foreground",
        isIconOnly
          ? "mx-auto w-10 justify-center rounded-full px-0"
          : "w-full justify-start gap-3 rounded-[var(--radius-card)] px-3",
        active
          ? "border ds-border-emphasis bg-sidebar-accent text-foreground shadow-control hover:bg-sidebar-accent"
          : "border ds-border-transparent hover:bg-hover-soft hover:text-foreground",
      )}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        title={isIconOnly ? label : undefined}
        onClick={onNavigate}
      >
        <span className="relative">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {isIconOnly && hasUnseen ? (
            <IconCountBadge
              count={1}
              display="dot"
              variant={badgeVariant}
              className="absolute -right-1.5 -top-1.5"
              aria-hidden="true"
            />
          ) : null}
        </span>
        {isIconOnly ? <span className="sr-only">{label}</span> : null}
        {!isIconOnly && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {label}
            </span>
            {hasUnseen ? (
              <IconCountBadge
                count={1}
                display="dot"
                variant={badgeVariant}
                className="ml-auto"
                aria-hidden="true"
              />
            ) : null}
          </>
        )}
        {hasUnseen ? (
          <span className="sr-only">, com novas atualizações</span>
        ) : null}
      </Link>
    </Button>
  );
}
