"use client";

import { useState } from "react";
import { useAppData } from "@/features/pedidos/model/app-data-provider";
import { DashboardOverview } from "@/widgets/pedido-dashboard/ui/dashboard-overview";
import { DashboardOverviewSkeleton, DashboardRouteLoading } from "@/widgets/pedido-dashboard/ui/dashboard-overview-skeleton";
import { CollectionSelector } from "@/features/pedidos/ui/collection-selector";
import { getColecaoVigente } from "@/shared/lib/colecao";
import { routes } from "@/shared/config/routes";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { FeatureBoundary } from "@/shared/ui/primitives/feature-boundary";
import { PageShell } from "@/shared/ui/primitives/page-shell";
import { ErrorState } from "@/shared/ui/composite/DataState";

export default function VisaoGeralPage() {
  const {
    overviewLoading,
    overviewError,
    overviewRefreshError,
    refetchOverview,
    selectedChannel,
    setSelectedChannel,
  } = useAppData();

  const [selectedCollection] = useState<number>(() =>
    getColecaoVigente(new Date()),
  );

  return (
    <FeatureBoundary
      fallback={<DashboardRouteLoading />}
      recoveryActions={[{ label: "Ver pedidos", href: routes.pedidos }]}
    >
      <PageShell>
        <StandardPageHeader
          page="visaoGeral"
          className="mb-0"
          supportingContent={
            <CollectionSelector
              selectedCollection={selectedCollection}
            />
          }
        />

        <div>
          {/* Enquanto os pedidos não chegam o painel mostraria todos os
              indicadores zerados — número errado é pior que número nenhum. O
              esqueleto ocupa exatamente o mesmo espaço até o dado chegar. */}
          {overviewError ? (
            <ErrorState message={overviewError} onRetry={refetchOverview} />
          ) : overviewLoading ? (
            <DashboardOverviewSkeleton />
          ) : (
            <div className="space-y-4">
              {overviewRefreshError ? (
                <ErrorState message={overviewRefreshError} onRetry={refetchOverview} />
              ) : null}
              <DashboardOverview
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
              />
            </div>
          )}
        </div>
      </PageShell>
    </FeatureBoundary>
  );
}
