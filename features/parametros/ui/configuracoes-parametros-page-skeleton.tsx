"use client";

import {
  DataTableSkeleton,
  SectionHeadingSkeleton,
} from "@/shared/ui/composite/skeletons";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { PageShell } from "@/shared/ui/primitives/page-shell";

/**
 * Esqueletos da tela de Configurações de Parâmetros — mesmo molde do
 * `usuarios-page-skeleton.tsx`, de onde as duas tabelas desta tela vieram:
 * cabeçalho de página real (título e botão de voltar não são dado que carrega)
 * e esqueleto só na área que depende do back-end.
 *
 * A contagem de colunas segue a real, para a tela não pular quando os dados
 * entram — solicitações: Nome/E-mail, Papéis, Data, Status, Solicitante + o
 * menu "..."; histórico: Data, Parâmetro, Solicitante, Decisão, Administrador,
 * Observações + o menu "...".
 */

const MENSAGEM_CARREGANDO = "Carregando solicitações e histórico de parâmetros...";

export function ConfiguracoesParametrosDataSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={MENSAGEM_CARREGANDO}
    >
      {/* A mensagem vira rótulo do leitor de tela: quem enxerga já entende o
          carregamento pela forma, e a região viva não fica muda. */}
      <span className="sr-only">{MENSAGEM_CARREGANDO}</span>

      {/* O esqueleto é decorativo: sem isso o leitor de tela varre dezenas de
          caixas vazias antes de chegar ao conteúdo. */}
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div>
          <SectionHeadingSkeleton />
          <DataTableSkeleton
            rows={6}
            columns={6}
            showHeader={false}
            showToolbar
            showFooter
          />
        </div>

        {/* `mt-8` repete a margem própria da ParameterHistoryTable
            (`w-full mt-8`), somada ao gap-6 do container — o mesmo respiro
            entre as duas tabelas do estado carregado. */}
        <div className="mt-8">
          <SectionHeadingSkeleton withIcon />
          <DataTableSkeleton
            rows={3}
            columns={7}
            showHeader={false}
            showToolbar
            showFooter
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Tela inteira — usada como `fallback` do `FeatureBoundary`, que fica FORA do
 * `PageShell` e por isso precisa reconstruir a moldura da página.
 */
export function ConfiguracoesParametrosPageSkeleton() {
  return (
    <PageShell>
      <StandardPageHeader page="configuracoesParametros" className="mb-0" />
      <div>
        <ConfiguracoesParametrosDataSkeleton />
      </div>
    </PageShell>
  );
}
