import type { ComponentProps } from "react";

import {
  getStandardPageMetadata,
  type StandardPageKey,
} from "@/shared/config/page-metadata";
import { PageHeader } from "@/shared/ui/composite/PageHeader";
import type { BackButtonProps } from "@/shared/ui/primitives/back-button";

type AppPageHeaderProps = ComponentProps<typeof PageHeader>;

/**
 * Cabeçalho padrão das telas do app — molde do `ManagerStandardPageHeader` do
 * Ara. A página passa só a chave: título e botão de voltar saem do registro em
 * `shared/config/page-metadata.ts`.
 *
 * `subtitle` fica de fora de propósito: no padrão do projeto o cabeçalho de página
 * é só o botão de voltar mais o título. Texto de apoio, quando existe, é
 * responsabilidade do conteúdo (cabeçalho de card, por exemplo) — não do
 * cabeçalho da rota.
 */
interface StandardPageHeaderProps
  extends Omit<AppPageHeaderProps, "title" | "subtitle" | "backButton"> {
  page: StandardPageKey;
}

export function StandardPageHeader({ page, ...props }: StandardPageHeaderProps) {
  const metadata = getStandardPageMetadata(page);

  // Home do app (`defaultBackHref: null`) não ganha botão de voltar.
  const resolvedBackButton: BackButtonProps | undefined =
    metadata.defaultBackHref === null
      ? undefined
      : {
          mode: "history",
          fallbackHref: metadata.defaultBackHref ?? undefined,
          ariaLabel: metadata.backAriaLabel,
        };

  return (
    <PageHeader
      {...props}
      title={metadata.title}
      backButton={resolvedBackButton}
    />
  );
}
