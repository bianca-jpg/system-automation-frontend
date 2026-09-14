import { cn } from '@/shared/lib/cn';
import {
  BarListSkeleton,
  ChartCardSkeleton,
  MetricGridSkeleton,
} from '@/shared/ui/composite/skeletons';
import { Card } from '@/shared/ui/primitives/card';
import { PageShell } from '@/shared/ui/primitives/page-shell';
import { StandardPageHeader } from '@/shared/ui/composite/StandardPageHeader';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { GRID_KPIS_ATUAL, QTD_KPIS_ATUAL } from '@/widgets/pedido-dashboard/ui/collection-summary-cards';

/**
 * Esqueleto do `DashboardOverview` — mesma pilha, na mesma ordem: cartão de
 * canais, grade de indicadores e os dois cartões de gráfico. Cada peça reserva
 * o espaço da peça real, então a troca por dados não desloca nada.
 *
 * O cabeçalho da rota (`StandardPageHeader`) fica FORA daqui de propósito: ele
 * não depende de dado nenhum e continua renderizado de verdade enquanto os
 * pedidos carregam — só a área de dados vira esqueleto.
 */

const MENSAGEM_CARREGANDO = 'Carregando visão geral...';

// Larguras das abas de canal, na ordem de `CANAIS`: "Consolidado (Todos)",
// "Multimarcas" e "Franquias". Fixas, e não proporcionais, porque as pílulas
// reais se dimensionam pelo texto — que já é conhecido.
const LARGURAS_ABAS_CANAL = ['w-40', 'w-28', 'w-24'];

// Barras do "Desempenho de Pedidos": a distribuição da esquerda tem três
// segmentos (OR sem adequação / com adequação / processado externo) e a da
// direita, dois (liberados / bloqueados sem crédito).
const BARRAS_PROCESSADOS = 3;
const BARRAS_ACUMULADOS = 2;

// O card de faturamento mostra uma barra por coleção da série. A quantidade só
// se conhece quando o Databricks responde; cinco é a altura média do card em
// produção e evita tanto o salto para baixo quanto o vão em branco.
const BARRAS_FATURAMENTO = 5;

export function DashboardOverviewSkeleton() {
  return (
    <div
      id="dashboard-overview-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={MENSAGEM_CARREGANDO}
    >
      <span className="sr-only">{MENSAGEM_CARREGANDO}</span>

      {/* O esqueleto é decorativo: sem isso o leitor de tela varre dezenas de
          caixas vazias antes de chegar ao conteúdo. */}
      <div aria-hidden="true" className="space-y-6">

        {/* Cartão de canais — mesmo chrome e mesma distribuição do cartão
            real: texto à esquerda, abas à direita. */}
        <Card
          variant="elevated"
          className="flex flex-col gap-4 p-5 py-5 md:flex-row md:items-center md:justify-between"
        >
          {/* "SYSTEM INTEGRATION" + a linha de apoio embaixo. */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>

          {/* Mesma caixa do `PageTabsBar` (variante pill): trilho redondo com
              `bg-muted` e as pílulas de 2rem dentro. */}
          <div className="flex w-fit shrink-0 items-center gap-1 self-start rounded-full bg-muted p-1 md:self-center">
            {LARGURAS_ABAS_CANAL.map((largura) => (
              <Skeleton key={largura} className={cn('h-8 rounded-full', largura)} />
            ))}
          </div>
        </Card>

        {/* Indicadores — grade e contagem vêm do próprio
            `collection-summary-cards`, para não haver duas verdades. */}
        <MetricGridSkeleton
          cards={QTD_KPIS_ATUAL}
          className={GRID_KPIS_ATUAL}
          showDescription
          firstCardExtraLine
        />

        {/* Cartões de gráfico, na mesma grade `gap-4` do bloco real. */}
        <div className="grid gap-4">

          {/* Desempenho de Pedidos — duas distribuições lado a lado a partir do
              `sm`, cada uma com o título centralizado em cima. */}
          <ChartCardSkeleton showActions className="min-w-0">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                {/* "Pedidos Processados" / "Pedidos Acumulados": título curto,
                    centralizado, com o mesmo `mb-3` do original. */}
                <Skeleton className="mx-auto mb-3 h-3 w-36 max-w-full" />
                <BarListSkeleton bars={BARRAS_PROCESSADOS} />
              </div>
              <div>
                <Skeleton className="mx-auto mb-3 h-3 w-36 max-w-full" />
                <BarListSkeleton bars={BARRAS_ACUMULADOS} />
              </div>
            </div>
          </ChartCardSkeleton>

          {/* Faturamento Distribuído — destaque (coleção atual + variação)
              antes da série de barras. */}
          <ChartCardSkeleton showActions className="min-w-0">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-36 max-w-full" />
                {/* Altura do big number: text-2xl, subindo para text-3xl no xl. */}
                <Skeleton className="h-8 w-52 max-w-full xl:h-9" />
              </div>
              <Skeleton className="h-6 w-28 shrink-0 rounded-full" />
            </div>

            <BarListSkeleton bars={BARRAS_FATURAMENTO} />
          </ChartCardSkeleton>

        </div>
      </div>
    </div>
  );
}

/**
 * Tela inteira — o `fallback` do `FeatureBoundary` fica FORA do `PageShell`,
 * então precisa remontar a moldura da página (largura, gutters e cabeçalho).
 * Sem isso o esqueleto aparece colado nas bordas e sem título, divergindo das
 * rotas irmãs, que usam o `OrdersRouteLoading` justamente por esse motivo.
 */
export function DashboardRouteLoading() {
  return (
    <PageShell>
      <StandardPageHeader page="visaoGeral" className="mb-0" />
      <div>
        <DashboardOverviewSkeleton />
      </div>
    </PageShell>
  );
}
