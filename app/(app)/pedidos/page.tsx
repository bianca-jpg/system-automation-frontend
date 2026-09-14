"use client";

import { useAppData } from "@/features/pedidos/model/app-data-provider";
import { OrdersList } from "@/widgets/pedido-dashboard/ui/orders-list";
import { OrdersRouteLoading } from "@/widgets/pedido-dashboard/ui/orders-list-skeleton";
import { isAdequacaoActiveMonth } from "@/shared/lib/colecao";
import { routes } from "@/shared/config/routes";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { FeatureBoundary } from "@/shared/ui/primitives/feature-boundary";
import { PageShell } from "@/shared/ui/primitives/page-shell";

export default function PedidosPage() {
  const {
    selectedChannel,
    selectedMonthSimulated,
    resumo,
    erroDeCarga,
    tentarNovamenteRecursos,
    refetchPedidosResumo,
  } = useAppData();

  const isAdequacaoActive = isAdequacaoActiveMonth(selectedMonthSimulated);
  const channelStats = resumo?.statsByChannel?.[selectedChannel];

  return (
    <FeatureBoundary
      fallback={
        <OrdersRouteLoading
          page="pedidos"
          activeTab="abertos"
        />
      }
      recoveryActions={[{ label: "Voltar para a Visão Geral", href: routes.visaoGeral }]}
    >
      <PageShell>
        <StandardPageHeader
          page="pedidos"
          className="mb-0"
        />

        <div>
          <OrdersList
            selectedChannel={selectedChannel}
            isAdequacaoActive={isAdequacaoActive}
            activeTab="abertos"
            refetchOrders={refetchPedidosResumo}
            awaitingChannelTotal={channelStats?.liberadosCount}
            editingChannelTotal={channelStats?.editingOrderCount}
            channelTotalsLoading={!resumo && !erroDeCarga}
            channelTotalsError={erroDeCarga}
            onRetryChannelTotals={tentarNovamenteRecursos}
          />
        </div>
      </PageShell>
    </FeatureBoundary>
  );
}
