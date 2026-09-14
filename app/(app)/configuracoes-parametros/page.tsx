"use client";

import { useCallback, useState } from "react";
import { UserManagementTable, type UserTableRow } from "@/features/usuarios/ui/user-management-table";
import { ParameterRequestModal } from "@/features/parametros/ui/parameter-request-modal";
import { ParameterHistoryTable } from "@/features/parametros/ui/parameter-history-table";
import { fetchChangeRequests, reviewChangeRequest } from "@/features/parametros/api/change-requests.api";
import {
  ConfiguracoesParametrosDataSkeleton,
  ConfiguracoesParametrosPageSkeleton,
} from "@/features/parametros/ui/configuracoes-parametros-page-skeleton";
import { ErrorState } from "@/shared/ui/composite/DataState";
import { routes } from "@/shared/config/routes";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { FeatureBoundary } from "@/shared/ui/primitives/feature-boundary";
import { PageShell } from "@/shared/ui/primitives/page-shell";
import type { ParameterChangeRequest } from "@/entities/parametro/model/types";
import { ROLE_LEVEL } from "@/shared/config/auth/automation-roles";
import { Can, usePermissions } from "@/shared/config/auth/permissions";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { usePagedResource } from "@/shared/hooks/use-paged-resource";
import type { DynamicTableSortingState } from "@/shared/ui/primitives/dynamic-table";

const CHANGE_TYPE_LABEL: Record<ParameterChangeRequest["change_type"], string> = {
  create: "Criação de parâmetro",
  update: "Atualização de parâmetro",
  delete: "Exclusão de parâmetro",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Formata um id de usuário para exibição, tratando o caso de usuário excluído
// (hard delete zera requested_by/reviewed_by via ON DELETE SET NULL — migration 032).
function formatUsuario(userId: number | null): string {
  return userId == null ? "Usuário removido" : `Usuário #${userId}`;
}

// Traduz ParameterChangeRequest (formato real do backend) para o formato que
// ParameterHistoryTable/HistoryDetailsModal esperam.
function toHistoryItem(req: ParameterChangeRequest) {
  const chave = req.target_chave || (typeof req.proposed_payload?.chave === "string" ? req.proposed_payload.chave : null);
  return {
    id: req.id,
    date: formatDate(req.reviewed_at || req.updated_at),
    parameter: chave || "(não informado)",
    requester: formatUsuario(req.requested_by),
    decision: req.status === "approved" ? "Aprovado" : "Rejeitado",
    admin: formatUsuario(req.reviewed_by),
    notes: req.justification || "Sem observações.",
  };
}

// Traduz ParameterChangeRequest para uma linha "SOLICITAÇÃO" da tabela, com
// `parameterRequestId` marcando que ela abre o modal real.
function toRequestRow(req: ParameterChangeRequest): UserTableRow {
  const chave = req.target_chave || (typeof req.proposed_payload?.chave === "string" ? req.proposed_payload.chave : null);
  return {
    kind: "request",
    id: `param-${req.id}`,
    parameterRequestId: req.id,
    title: chave || "(parâmetro não informado)",
    subtitle: CHANGE_TYPE_LABEL[req.change_type],
    requester: formatUsuario(req.requested_by),
    date: formatDate(req.created_at),
  };
}

/**
 * Configurações de Parâmetros — solicitações pendentes e histórico de decisões.
 *
 * Estes dois quadros moravam em `/usuarios`, que acumulava duas
 * responsabilidades sem relação entre si. Aqui eles ficam vizinhos de
 * `/parametros` no sidebar, que é o assunto de que tratam; Gestão de Usuários
 * ficou só com usuários e permissões.
 *
 * O gate de nível (administrador, 40) é o mesmo que estes quadros já tinham em
 * `/usuarios` — decidir parâmetro continua sendo ato administrativo. A trava da
 * URL direta vive em `canAccessPath` (`shared/config/auth/automation-roles.ts`).
 */
export default function ConfiguracoesParametrosPage() {
  const { hasMinLevel } = usePermissions();
  const allowed = hasMinLevel(ROLE_LEVEL.administrador);
  const [selectedRequest, setSelectedRequest] = useState<ParameterChangeRequest | null>(null);
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const debouncedPendingSearch = useDebounce(pendingSearch, 300);
  const debouncedHistorySearch = useDebounce(historySearch, 300);
  const [pendingSorting, setPendingSorting] = useState<DynamicTableSortingState>([
    { id: "date", desc: true },
  ]);
  const [historySorting, setHistorySorting] = useState<DynamicTableSortingState>([
    { id: "date", desc: true },
  ]);

  const pendingSort = pendingSorting[0];
  const fetchPendingPage = useCallback((page: number, signal: AbortSignal) => {
    const sort = pendingSort?.id === "title"
      ? "parameter"
      : pendingSort?.id === "date"
        ? "createdAt"
        : pendingSort?.id === "status"
          ? "status"
          : "id";
    return fetchChangeRequests({
      page,
      statusFilter: "pending",
      search: debouncedPendingSearch,
      sort,
      order: pendingSort?.desc ? "desc" : "asc",
      signal,
    });
  }, [debouncedPendingSearch, pendingSort?.desc, pendingSort?.id]);
  const pending = usePagedResource({
    enabled: allowed,
    queryKey: `${debouncedPendingSearch}|${pendingSort?.id ?? "id"}|${pendingSort?.desc ? "desc" : "asc"}`,
    fetchPage: fetchPendingPage,
  });

  const historySort = historySorting[0];
  const fetchHistoryPage = useCallback((page: number, signal: AbortSignal) => {
    const sort = historySort?.id === "parameter"
      ? "parameter"
      : historySort?.id === "decision"
        ? "status"
        : historySort?.id === "date"
          ? "updatedAt"
          : "id";
    return fetchChangeRequests({
      page,
      statusFilter: "resolved",
      search: debouncedHistorySearch,
      sort,
      order: historySort?.desc ? "desc" : "asc",
      signal,
    });
  }, [debouncedHistorySearch, historySort?.desc, historySort?.id]);
  const history = usePagedResource({
    enabled: allowed,
    queryKey: `${debouncedHistorySearch}|${historySort?.id ?? "id"}|${historySort?.desc ? "desc" : "asc"}`,
    fetchPage: fetchHistoryPage,
  });

  // O hook consolidado zera `loadedOnce` sempre que `queryKey` muda (busca ou
  // ordenação de qualquer uma das listas), para não exibir "last-good" de outro
  // filtro. Sem esta trava, `initialLoading` voltaria a `true` a cada
  // busca/ordenação e o esqueleto de TELA CHEIA engoliria as duas tabelas e os
  // dois campos de busca. O esqueleto abaixo é exclusivo da primeira carga.
  //
  // Ajuste de estado durante o render (padrão do próprio hook consolidado, ver
  // `navigation` em use-paged-resource.ts) em vez de useRef: o lint deste
  // projeto (react-hooks/refs) proíbe ler `.current` durante o render.
  const [jaCarregaram, setJaCarregaram] = useState(false);
  if (!jaCarregaram && pending.loadedOnce && history.loadedOnce) {
    setJaCarregaram(true);
  }
  const initialLoading = !jaCarregaram && [pending, history].some(resource => (
    resource.loading && !resource.loadedOnce
  ));
  const loadError = pending.error ?? history.error;

  const handleRetry = useCallback(() => {
    pending.reload();
    history.reload();
  }, [history, pending]);

  // Aprovação/reprovação real de mudança de parâmetro: chama o endpoint do
  // backend e recarrega as listas — a solicitação sai de "pendentes" e aparece
  // no histórico imediatamente, sem F5.
  const handleConfirmParameterDecision = async (id: number, decision: "approved" | "rejected") => {
    await reviewChangeRequest(id, decision);
    pending.reload();
    history.reload();
    setSelectedRequest(null);
  };

  const handleSelectParameterRequest = (parameterRequestId: number) => {
    const request = pending.rows.find((r) => r.id === parameterRequestId) || null;
    setSelectedRequest(request);
  };

  return (
    <Can minLevel={ROLE_LEVEL.administrador} fallback={<AcessoNegado />}>
      <FeatureBoundary
        fallback={<ConfiguracoesParametrosPageSkeleton />}
        recoveryActions={[{ label: "Voltar para a Visão Geral", href: routes.visaoGeral }]}
      >
        <PageShell>
          <StandardPageHeader
            page="configuracoesParametros"
            className="mb-0"
          />

          <div className="flex flex-col gap-6">
            {initialLoading ? (
              <ConfiguracoesParametrosDataSkeleton />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={handleRetry} />
            ) : (
              <>
                <UserManagementTable
                  rows={pending.rows.map(toRequestRow)}
                  onSelectParameterRequest={handleSelectParameterRequest}
                  title="Solicitações pendentes de parâmetros"
                  description="Solicitações aguardando decisão administrativa."
                  page={pending.page}
                  pageSize={pending.pageSize}
                  total={pending.total}
                  onPageChange={pending.setPage}
                  loading={pending.loading || pending.refreshing}
                  searchValue={pendingSearch}
                  onSearchChange={value => setPendingSearch(value.slice(0, 120))}
                  isSearching={pendingSearch !== debouncedPendingSearch}
                  sorting={pendingSorting}
                  onSortingChange={setPendingSorting}
                  persistKey="automation:configuracoes-parametros:solicitacoes"
                  noun={["solicitação", "solicitações"]}
                />

                <ParameterHistoryTable
                  history={history.rows.map(toHistoryItem)}
                  page={history.page}
                  pageSize={history.pageSize}
                  total={history.total}
                  onPageChange={history.setPage}
                  loading={history.loading || history.refreshing}
                  searchValue={historySearch}
                  onSearchChange={value => setHistorySearch(value.slice(0, 120))}
                  isSearching={historySearch !== debouncedHistorySearch}
                  sorting={historySorting}
                  onSortingChange={setHistorySorting}
                />

                <ParameterRequestModal
                  isOpen={!!selectedRequest}
                  onClose={() => setSelectedRequest(null)}
                  request={selectedRequest}
                  onConfirm={handleConfirmParameterDecision}
                />
              </>
            )}
          </div>
        </PageShell>
      </FeatureBoundary>
    </Can>
  );
}

function AcessoNegado() {
  return (
    <PageShell>
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-card border ds-border-destructive bg-destructive/5 px-6 py-16 text-center shadow-card"
      >
        <h1 className="font-heading text-base font-bold uppercase tracking-wide text-destructive">
          Acesso restrito
        </h1>
        <p className="max-w-md text-sm font-medium text-muted-foreground">
          Você não tem permissão para decidir solicitações de parâmetros. Fale com um administrador se precisar de acesso.
        </p>
      </div>
    </PageShell>
  );
}
