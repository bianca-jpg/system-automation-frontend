import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import {
  BackButton,
  type BackButtonProps,
} from "@/shared/ui/primitives/back-button";
import {
  PageHeader as DesignSystemPageHeader,
  type PageHeaderProps as DesignSystemPageHeaderProps,
} from "@/shared/ui/primitives/page-header";

/**
 * Wrapper do app sobre o `PageHeader` do design system — mesmo contrato do
 * manager do Ara (`components/page-header.tsx`): a página descreve o botão de
 * voltar por dados e o wrapper o monta no slot `navigation`, sempre com a
 * mesma aparência (ícone redondo, fantasma).
 *
 * `breadcrumb` e `navigation` ficam de fora de propósito: o slot de navegação é
 * do botão de voltar, e quem precisar de breadcrumb usa o componente do DS
 * direto.
 */
interface PageHeaderProps
  extends Omit<DesignSystemPageHeaderProps, "breadcrumb" | "navigation"> {
  title: ReactNode;
  backButton?: BackButtonProps | undefined;
}

export function PageHeader({ backButton, ...props }: PageHeaderProps) {
  return (
    <DesignSystemPageHeader
      {...props}
      navigation={
        backButton ? (
          <BackButton
            {...backButton}
            iconOnly={backButton.iconOnly ?? true}
            variant={backButton.variant ?? "ghost"}
            size={backButton.size ?? "icon"}
            className={cn(backButton.className)}
          />
        ) : null
      }
    />
  );
}
