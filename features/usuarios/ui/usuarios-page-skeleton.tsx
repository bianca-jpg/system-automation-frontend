"use client";

import {
  DataTableSkeleton,
  SectionHeadingSkeleton,
} from "@/shared/ui/composite/skeletons";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { PageShell } from "@/shared/ui/primitives/page-shell";

/**
 * Esqueletos da tela de Usuários — molde do `manager-route-loading.tsx` do Ara:
 * cabeçalho de página real (título e botão de voltar não são dado que carrega) e
 * esqueleto só na área que depende do back-end.
 *
 * A tabela é espelhada com o número REAL de colunas: se o esqueleto tivesse
 * menos colunas que a tabela, a tela pularia na troca — que é exatamente o que
 * o esqueleto existe para evitar.
 */

const MENSAGEM_CARREGANDO = "Carregando usuários...";

/**
 * Área de dados: a `UserManagementTable` de usuários e permissões.
 *
 * A tela já teve três tabelas; as de solicitações de parâmetros e histórico de
 * decisões saíram para `/configuracoes-parametros`, e o esqueleto encolheu
 * junto — reservar espaço para tabelas que não vêm mais faria a tela saltar
 * para cima quando os dados chegassem.
 *
 * Ela migrou para o `DynamicTable` do design system, e a moldura mudou de forma
 * junto: o título da seção saiu de dentro do cartão (agora é um
 * `SectionHeadingSkeleton` acima dele) e o topo do cartão passou a ser a barra
 * de busca + contagem (`showToolbar`). A contagem de colunas segue a real —
 * Nome/E-mail, Papéis, Data, Status, Solicitante + o menu "...".
 */
export function UsuariosDataSkeleton() {
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
      </div>
    </div>
  );
}

/**
 * Tela inteira — usada como `fallback` do `FeatureBoundary`, que fica FORA do
 * `PageShell` e por isso precisa reconstruir a moldura da página.
 */
export function UsuariosPageSkeleton() {
  return (
    <PageShell>
      <StandardPageHeader page="usuarios" className="mb-0" />
      <div>
        <UsuariosDataSkeleton />
      </div>
    </PageShell>
  );
}
