import {
  CircleCheck,
  ClipboardList,
  CreditCard,
  PackageX,
} from '@/shared/ui/icons';
import { MetricCard } from '@/shared/ui/primitives/metric-card';
import { Typography } from '@/shared/ui/primitives/Typography';
import { OrderStats } from '@/widgets/pedido-dashboard/lib/dashboard-stats';

// Grades canônicas de KPI do manager: dois cartões no tablet e a linha cheia no
// desktop. O `MetricCard` do design system já traz título, ícone-tooltip, valor
// e descrição — nenhuma escala tipográfica é reposta aqui de propósito, é o que
// mantém os big numbers idênticos aos dos painéis do manager.
//
// A grade da coleção vigente é exportada porque o esqueleto de carregamento
// (`DashboardOverviewSkeleton`) reusa a MESMA grade e a MESMA contagem de
// cartões: se divergirem, a tela pula no instante em que os indicadores chegam.
export const GRID_KPIS_ATUAL = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4';

/** Quantos `MetricCard` o `CurrentCollectionMetrics` renderiza. */
export const QTD_KPIS_ATUAL = 4;



interface CurrentCollectionMetricsProps {
  stats: OrderStats;
}

// LAYOUT PARA COLEÇÃO ATUAL (Vigente / Próxima)
export function CurrentCollectionMetrics({ stats }: CurrentCollectionMetricsProps) {
  const {
    totalOrdersCount, liberadosCount, bloqueadosSemCreditoCount,
    liberadosPercent, pecasBloqueadasCount, pecasBloqueadasPercent, bloqueadosSemCreditoPercent,
  } = stats;

  return (
    <div className={GRID_KPIS_ATUAL}>

      {/* Metric 2: Pedidos Acumulados */}
      <MetricCard
        title="Pedidos Acumulados"
        icon={ClipboardList}
        tooltip="Todas as ordens do canal selecionado: liberadas, com OR gerada e bloqueadas."
        value={totalOrdersCount}
        description="Total de ordens no sistema"
      >
        <Typography as="p" variant="caption" className="text-muted-foreground">
          <span className="font-bold text-foreground">{liberadosCount}</span> liberados ·{' '}
          <span className="font-bold text-foreground">{bloqueadosSemCreditoCount}</span> sem crédito
        </Typography>
      </MetricCard>

      {/* Metric 3: pedidos liberados. A cor de status vive no valor — sobre a
          superfície neutra do cartão o token cromático é o legível. */}
      <MetricCard
        title="Pedidos Liberados"
        icon={CircleCheck}
        tooltip="Pedidos com crédito aprovado e prontos para faturamento."
        value={liberadosCount}
        valueClassName="text-info"
        description={`${liberadosPercent}% do total global`}
      />

      {/* Metric 4: Peças Bloqueadas Estoque */}
      <MetricCard
        title="Peças Bloqueadas Estoque"
        icon={PackageX}
        tooltip="Faturamento impedido por falta de estoque: a demanda das peças liberadas que excede o estoque disponível."
        value={pecasBloqueadasCount}
        valueClassName="text-destructive"
        description={`${pecasBloqueadasPercent}% das peças liberadas`}
      />

      {/* Metric 5: Bloqueados sem crédito */}
      <MetricCard
        title="Bloqueados sem crédito"
        icon={CreditCard}
        tooltip="Pedidos barrados por estouro do limite comercial de crédito."
        value={bloqueadosSemCreditoCount}
        valueClassName="text-warning"
        description={`${bloqueadosSemCreditoPercent}% do total global`}
      />

    </div>
  );
}
