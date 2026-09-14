import { routes } from "@/shared/config/routes";

/**
 * Registro central de metadados das páginas do app — mesmo molde do manager do
 * Ara (`lib/manager-page-metadata.ts`). Título e botão de voltar deixam de ser
 * strings soltas dentro de cada `page.tsx`: a página só informa a chave e o
 * `StandardPageHeader` resolve o resto aqui.
 *
 * As rotas vêm de `shared/config/routes.ts` — nada de repetir caminho em string.
 */
export type StandardPageKey =
  | "visaoGeral"
  | "pedidos"
  | "historico"
  | "alertas"
  | "parametros"
  | "configuracoesParametros"
  | "usuarios";

type StandardPageMeta = {
  title: string;
  /**
   * Destino usado pelo botão de voltar quando não há histórico do navegador
   * (entrada direta pela URL). `null` marca a home do app: lá o botão de voltar
   * não aparece, do mesmo jeito que o chat do manager do Ara — que também fica
   * fora do registro por ser a origem das demais telas.
   */
  defaultBackHref: string | null;
  backAriaLabel: string;
};

const STANDARD_PAGE_METADATA: Record<StandardPageKey, StandardPageMeta> = {
  visaoGeral: {
    title: "Visão Geral - Dashboard Comercial",
    defaultBackHref: null,
    backAriaLabel: "Voltar para a tela anterior",
  },
  pedidos: {
    title: "Pedidos em Aberto",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
  historico: {
    title: "Histórico e Faturamentos Recentes",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
  alertas: {
    title: "Central de Alertas e Comunicações",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
  parametros: {
    title: "Parâmetros da Aplicação",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
  configuracoesParametros: {
    title: "Configurações de Parâmetros",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
  usuarios: {
    title: "Gestão de Usuários",
    defaultBackHref: routes.visaoGeral,
    backAriaLabel: "Voltar para a Visão Geral",
  },
};

export function getStandardPageMetadata(page: StandardPageKey): StandardPageMeta {
  return STANDARD_PAGE_METADATA[page];
}
