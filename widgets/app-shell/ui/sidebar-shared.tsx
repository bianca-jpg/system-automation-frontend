"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/primitives/Typography";
import { BrandWordmark } from "@/shared/ui";

/**
 * Primitivos visuais da sidebar do shell, portados do manager do Ara
 * (`features/navigation/components/sidebar-shared.tsx`) — que é o padrão visual
 * da empresa. Mantêm logo, espaçamento de pilha e estado de press idênticos nos
 * dois painéis sem duplicar as classes item a item.
 */

export const SIDEBAR_STACK_SPACING_CLASS = "space-y-2";
export const SIDEBAR_SECTION_GAP_CLASS = "mt-4";
// `duration-[var(--motion-duration-standard)]` (200ms) em vez de `duration-200`:
// o token é zerado dentro de `@media (prefers-reduced-motion: reduce)` pelo
// design system, o valor cru não. `motion-reduce:transition-none` é o mesmo
// idioma já usado nas transições de slide/colapso da `app-sidebar.tsx`.
export const SIDEBAR_PRESS_STATE_CLASS =
  "transform-gpu transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-duration-standard)] motion-reduce:transition-none active:translate-y-[0.5px] active:shadow-none";

export function SidebarWordmark({ className }: { className?: string }) {
  // Estado de erro POR imagem. As duas versões do logo são renderizadas (a
  // troca claro/escuro é feita por CSS), então a versão oculta pelo tema também
  // é baixada — e uma falha nela não pode derrubar o logo do tema visível. Cada
  // slot cai no BrandWordmark de forma independente.
  const [isBlackLogoBroken, setIsBlackLogoBroken] = useState(false);
  const [isWhiteLogoBroken, setIsWhiteLogoBroken] = useState(false);

  return (
    <div className={cn("flex items-center", className)}>
      {/* `priority` nas duas imagens (como no manager do Ara): com ela só na
          versão clara, o preload no modo escuro apontaria para a imagem
          invisível. */}
      {isBlackLogoBroken ? (
        <BrandWordmark size="xs" className="dark:hidden" />
      ) : (
        <Image
          src="/assets/OR automation_INC_BLACK.png"
          alt="Logo"
          width={1182}
          height={133}
          unoptimized
          priority
          sizes="160px"
          className="block h-auto w-40 max-w-none shrink-0 select-none dark:hidden"
          onError={() => setIsBlackLogoBroken(true)}
        />
      )}
      {isWhiteLogoBroken ? (
        <BrandWordmark size="xs" className="hidden dark:flex" />
      ) : (
        <Image
          src="/assets/OR automation_INC_WHITE.png"
          alt="Logo"
          width={1182}
          height={133}
          unoptimized
          priority
          sizes="160px"
          className="hidden h-auto w-40 max-w-none shrink-0 select-none dark:block"
          onError={() => setIsWhiteLogoBroken(true)}
        />
      )}
    </div>
  );
}

export function SidebarIconLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-5 items-center justify-center", className)}>
      <Image
        src="/assets/logo-black.png"
        alt="Logo"
        width={30}
        height={20}
        unoptimized
        priority
        sizes="20px"
        className="block h-5 w-auto max-w-none shrink-0 select-none object-contain dark:hidden"
      />
      <Image
        src="/assets/logo-white.png"
        alt="Logo"
        width={30}
        height={20}
        unoptimized
        priority
        sizes="20px"
        className="hidden h-5 w-auto max-w-none shrink-0 select-none object-contain dark:block"
      />
    </div>
  );
}

type SidebarSectionToggleProps = {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function SidebarSectionToggle({
  label,
  expanded,
  onToggle,
  className,
}: SidebarSectionToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      ripple
      className={cn(
        SIDEBAR_PRESS_STATE_CLASS,
        // `rounded-[var(--radius-card)]` (1rem) e não `rounded-xl` (0.75rem da
        // escala crua do Tailwind): é o MESMO raio do `SidebarNavItem`, que fica
        // empilhado logo abaixo na mesma coluna.
        "mb-1 flex h-auto min-h-8 w-full items-center justify-between rounded-[var(--radius-card)] px-3 py-1.5 text-left text-sidebar-foreground hover:bg-hover-soft",
        className,
      )}
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <Typography as="span" variant="small" className="font-medium">
        {label}
      </Typography>
      {expanded ? (
        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </Button>
  );
}
