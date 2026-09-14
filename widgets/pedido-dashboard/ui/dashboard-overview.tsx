"use client";

import { useMemo } from 'react';
import { ChartPie } from '@/shared/ui/icons';
import { Order } from '@/shared/types/models';
import { Badge } from '@/shared/ui/primitives/badge';
import { Card, CardContent } from '@/shared/ui/primitives/card';
import { PageTabs, PageTabsBar } from '@/shared/ui/primitives/page-tabs';
import { useAppData } from '@/features/pedidos/model/app-data-provider';
import {
  computeEvolucaoSerie,
  computeOrderStats,
  EMPTY_ORDER_STATS,
} from '@/widgets/pedido-dashboard/lib/dashboard-stats';
import { HorizontalBarChart, type HorizontalBarData } from '@/shared/ui/primitives/horizontal-bar-chart';
import { ChartCardHeader } from '@/widgets/pedido-dashboard/ui/chart-card-header';
import { CurrentCollectionMetrics } from '@/widgets/pedido-dashboard/ui/collection-summary-cards';
import { FaturamentoChartCard } from '@/widgets/pedido-dashboard/ui/faturamento-chart-card';

/**
 * O `HorizontalBarChart` do design system recebe `value` como percentual (0-100)
 * e é ele quem renderiza o "%" à direita. Como o dashboard também precisa mostrar
 * a contagem absoluta, ela vai no rótulo — assim a barra dá a proporção e o texto
 * dá o número, sem depender de hover.
 */
function toBarData(
  segments: readonly { label: string; value: number; color: HorizontalBarData['color'] }[],
): HorizontalBarData[] {
  const total = segments.reduce((soma, s) => soma + s.value, 0);

  return segments.map((s) => ({
    name: `${s.label} · ${s.value}`,
    value: total > 0 ? (s.value / total) * 100 : 0,
    color: s.color,
  }));
}

type Canal = 'Todos' | 'Franquia' | 'Multimarca';

const CANAIS: readonly { value: Canal; label: string }[] = [
  { value: 'Todos', label: 'Consolidado (Todos)' },
  { value: 'Multimarca', label: 'Multimarcas' },
  { value: 'Franquia', label: 'Franquias' },
];

interface DashboardOverviewProps {
  /** Injeção de compatibilidade para testes isolados; a aplicação usa /resumo. */
  orders?: Order[];
  selectedChannel: Canal;
  setSelectedChannel: (channel: Canal) => void;
}

export function DashboardOverview({
  orders,
  selectedChannel,
  setSelectedChannel,
}: DashboardOverviewProps) {
  const { evolucaoFaturamento, resumo } = useAppData();

  const stats = useMemo(() => {
    const aggregated = resumo?.statsByChannel?.[selectedChannel];
    if (aggregated) return aggregated;
    if (orders) return computeOrderStats(orders, selectedChannel);
    return EMPTY_ORDER_STATS;
  }, [resumo, orders, selectedChannel]);

  // Série de evolução por coleção (planejado × distribuído), filtrada pelo canal
  // selecionado no dashboard (client-side): 'Todos' soma Franquia+Multimarca.
  const evolucaoSerie = useMemo(
    () => computeEvolucaoSerie(evolucaoFaturamento, selectedChannel),
    [evolucaoFaturamento, selectedChannel],
  );

  return (
    <div className="space-y-6">

      {/* Segmented Channel Tabs to separate Multimarca from Franquia */}
      <Card
        variant="elevated"
        className="flex flex-col gap-4 p-5 py-5 md:flex-row md:items-center md:justify-between"
      >
        <div>
          {/* `h2`: o h1 da rota vem do `StandardPageHeader`, então este é o
              primeiro heading de seção da /visao-geral. */}
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider font-heading">
            SYSTEM INTEGRATION
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
            Monitor de pedidos comerciais por canais de distribuição.
          </p>
        </div>

        {/* Segmented switcher do design system (tablist + navegação por setas). */}
        <PageTabs
          value={selectedChannel}
          onValueChange={(canal) => setSelectedChannel(canal as Canal)}
          className="w-fit space-y-0 self-start md:self-center"
        >
          <PageTabsBar
            items={CANAIS}
            triggerClassName="text-xs uppercase tracking-wide"
          />
        </PageTabs>
      </Card>

      <CurrentCollectionMetrics stats={stats} />

      {/* Cards de gráfico — mesmo chrome (card elevado + ChartCardHeader) e a
          mesma grade `gap-4` dos painéis analíticos do manager. */}
      <div className="grid gap-4">

        {/* Desempenho de Pedidos — duas distribuições lado a lado */}
        <Card variant="elevated" className="min-w-0">
          <ChartCardHeader
            title="Desempenho de Pedidos"
            description="Distribuição dos pedidos processados e do acumulado por status."
            icon={ChartPie}
            tooltip="Este gráfico ilustra a distribuição dos pedidos processados, divididos entre OR com adequação, OR sem adequação e pedidos bloqueados por falta de limite comercial de crédito."
            actions={
              <Badge variant="neutral" size="label" className="font-mono text-muted-foreground">
                Período: Hoje
              </Badge>
            }
          />

          <CardContent className="min-w-0 overflow-hidden pt-2">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {/* Categorias de processamento — a trinca `blue`/`sky`/`cyan` do
                  HorizontalBarChart mapeia para --analytics-chart-primary/secondary/
                  tertiary, que acompanham modo e `data-theme`. */}
              <div>
                <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                  Pedidos Processados
                </h3>
                <HorizontalBarChart
                  data={toBarData([
                    { label: 'OR sem adequação', value: stats.orSemAdequacaoCount, color: 'blue' },
                    { label: 'OR com adequação', value: stats.orComAdequacaoCount, color: 'sky' },
                    { label: 'Processado Externo', value: stats.processadoErpCount, color: 'cyan' },
                  ])}
                />
              </div>
              {/* Aqui os segmentos são estados (liberado × bloqueado), mas a
                  rampa analítica do projeto é MONOCROMÁTICA azul por decisão de
                  marca: `blue` e `amber` são nomes legados da API do
                  HorizontalBarChart e mapeiam para --analytics-chart-primary
                  (#0088ff) e --analytics-chart-warning (#3cd3fe) — dois degraus
                  de azul/ciano, não uma oposição informativo × alerta. A
                  distinção aqui é de degrau, não de status. */}
              <div>
                <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                  Pedidos Acumulados
                </h3>
                <HorizontalBarChart
                  data={toBarData([
                    { label: 'Liberados', value: stats.liberadosCount, color: 'blue' },
                    { label: 'Bloqueados sem crédito', value: stats.bloqueadosSemCreditoCount, color: 'amber' },
                  ])}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <FaturamentoChartCard evolucaoSerie={evolucaoSerie} selectedChannel={selectedChannel} />

      </div>

    </div>
  );
}
