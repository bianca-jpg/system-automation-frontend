"use client";

import { useAppData } from "@/features/pedidos/model/app-data-provider";
import { OrdersList } from "@/widgets/pedido-dashboard/ui/orders-list";
import { OrdersRouteLoading } from "@/widgets/pedido-dashboard/ui/orders-list-skeleton";
import { isAdequacaoActiveMonth } from "@/shared/lib/colecao";
import { routes } from "@/shared/config/routes";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { FeatureBoundary } from "@/shared/ui/primitives/feature-boundary";
import { PageShell } from "@/shared/ui/primitives/page-shell";

// O texto que o leitor de tela anuncia enquanto o esqueleto está na tela — é o
// mesmo aviso que antes ficava embaixo do spinner.
const ROTULO_CARREGANDO = "Carregando alertas do servidor...";

export default function AlertasPage() {
  const {
    selectedChannel,
    selectedMonthSimulated,
  } = useAppData();

  const isAdequacaoActive = isAdequacaoActiveMonth(selectedMonthSimulated);

  return (
    <FeatureBoundary
      fallback={
        <OrdersRouteLoading
          page="alertas"
          activeTab="alertas"
          label={ROTULO_CARREGANDO}
        />
      }
      recoveryActions={[{ label: "Voltar para a Visão Geral", href: routes.visaoGeral }]}
    >
      <PageShell>
        <StandardPageHeader
          page="alertas"
          className="mb-0"
        />

        <div>
          <OrdersList
            selectedChannel={selectedChannel}
            isAdequacaoActive={isAdequacaoActive}
            activeTab="alertas"
          />
        </div>
      </PageShell>
    </FeatureBoundary>
  );
}
