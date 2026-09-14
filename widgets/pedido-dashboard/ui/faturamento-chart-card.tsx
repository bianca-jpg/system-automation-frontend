import { useMemo } from 'react';
import { TrendingUp } from '@/shared/ui/icons';
import { formatCurrency } from '@/shared/lib/format/currency';
import { Badge } from '@/shared/ui/primitives/badge';
import { Card, CardContent } from '@/shared/ui/primitives/card';
import { EmptyState } from '@/shared/ui/primitives/empty-state';
import { HorizontalBarChart, type HorizontalBarData } from '@/shared/ui/primitives/horizontal-bar-chart';
import { Typography } from '@/shared/ui/primitives/Typography';
import { ChartCardHeader } from '@/widgets/pedido-dashboard/ui/chart-card-header';
import { EvolucaoSeriePoint, formatCompact } from '@/widgets/pedido-dashboard/lib/dashboard-stats';

interface FaturamentoChartCardProps {
  evolucaoSerie: EvolucaoSeriePoint[];
  selectedChannel: 'Todos' | 'Franquia' | 'Multimarca';
}

// Faturamento Distribuído por Coleção — série única (gráfico de barras).
export function FaturamentoChartCard({ evolucaoSerie, selectedChannel }: FaturamentoChartCardProps) {
  /**
   * O `HorizontalBarChart` do design system trabalha em percentual e rotula o
   * eixo com "%", o que não serve para faturamento. Então a barra recebe o valor
   * relativo à maior coleção da série (a proporção visual) e o valor em reais
   * vai no rótulo, com `showValues={false}` para o percentual não aparecer.
   */
  const barData = useMemo<HorizontalBarData[]>(() => {
    const maior = evolucaoSerie.reduce((max, ponto) => Math.max(max, ponto.distribuido), 0);

    return evolucaoSerie.map((ponto, i) => ({
      name: `Coleção ${ponto.colecao} · ${formatCompact(ponto.distribuido)}`,
      value: maior > 0 ? (ponto.distribuido / maior) * 100 : 0,
      // A coleção mais recente é o destaque do card; as anteriores ficam recessivas.
      color: i === evolucaoSerie.length - 1 ? 'blue' : 'slate',
      tooltip: {
        title: `Coleção ${ponto.colecao}`,
        description: `Valor distribuído: ${formatCurrency(ponto.distribuido)}`,
      },
    }));
  }, [evolucaoSerie]);

  // Destaque (hero): última coleção e variação vs a anterior.
  const evolUltima = evolucaoSerie[evolucaoSerie.length - 1];
  const evolPenultima = evolucaoSerie[evolucaoSerie.length - 2];
  const evolDeltaPct = evolUltima && evolPenultima && evolPenultima.distribuido > 0
    ? ((evolUltima.distribuido - evolPenultima.distribuido) / evolPenultima.distribuido) * 100
    : null;

  return (
    <Card variant="elevated" className="min-w-0">
      <ChartCardHeader
        title="Faturamento Distribuído por Coleção"
        description="Valor distribuído (R$) nas últimas coleções"
        icon={TrendingUp}
        tooltip="Histórico do valor faturado ao longo das últimas coleções, mostrando a tendência de crescimento ou queda no faturamento distribuído para os canais selecionados."
        actions={
          <Badge variant="neutral" size="label" className="text-muted-foreground">
            {selectedChannel === 'Todos' ? 'Todos os canais' : selectedChannel}
          </Badge>
        }
      />

      <CardContent className="min-w-0 overflow-hidden pt-2">
        {evolucaoSerie.length === 0 ? (
          <EmptyState
            variant="dashed"
            size="md"
            headingLevel={4}
            title="Sem dados de coleções disponíveis"
            className="h-56 justify-center"
          />
        ) : (
          <>
            {/* Destaque: coleção atual + variação vs anterior */}
            {evolUltima && (
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Coleção {evolUltima.colecao} · atual
                  </span>
                  {/* Mesmo degrau que o `MetricCard` do design system usa no big
                      number (`Typography as="p" variant="h3"`), para os números
                      do painel crescerem juntos no mesmo breakpoint. */}
                  <Typography as="p" variant="h3" className="mt-1 font-bold tracking-tight">
                    {formatCurrency(evolUltima.distribuido)}
                  </Typography>
                </div>
                {evolDeltaPct !== null && evolPenultima && (
                  <Badge
                    variant={evolDeltaPct >= 0 ? 'success' : 'destructive'}
                    size="label"
                    className="gap-1.5 font-bold"
                  >
                    <span>{evolDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(evolDeltaPct).toFixed(1)}%</span>
                    <span className="font-medium text-muted-foreground">vs {evolPenultima.colecao}</span>
                  </Badge>
                )}
              </div>
            )}

            <div className="w-full">
              <HorizontalBarChart data={barData} showValues={false} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
