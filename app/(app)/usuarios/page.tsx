"use client";

import { useCallback, useState } from "react";
import { UserManagementTable, type UserTableRow } from "@/features/usuarios/ui/user-management-table";
import type { AdminUser } from "@/entities/usuario/model/types";
import { deleteUser, fetchUsers as fetchUsersApi, updateUserRole } from "@/features/usuarios/api/users.api";
import {
  UsuariosDataSkeleton,
  UsuariosPageSkeleton,
} from "@/features/usuarios/ui/usuarios-page-skeleton";
import { ErrorState } from "@/shared/ui/composite/DataState";
import { routes } from "@/shared/config/routes";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { FeatureBoundary } from "@/shared/ui/primitives/feature-boundary";
import { PageShell } from "@/shared/ui/primitives/page-shell";
import { ROLE_LEVEL, type automationRole } from "@/shared/config/auth/automation-roles";
import { Can, usePermissions } from "@/shared/config/auth/permissions";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { usePagedResource } from "@/shared/hooks/use-paged-resource";
import type { DynamicTableSortingState } from "@/shared/ui/primitives/dynamic-table";

function toUserRow(u: AdminUser): UserTableRow {
  return {
    kind: "user",
    id: u.id,
    title: u.email,
    roles: u.roles,
    confirmedAt: u.confirmed_at,
  };
}

/**
 * Gestão de Usuários — usuários cadastrados e seus perfis de acesso.
 *
 * Esta tela também abrigava as solicitações pendentes de parâmetros e o
 * histórico de decisões. Os dois saíram para `/configuracoes-parametros`, ao
 * lado de Parâmetros no sidebar: são assunto de parâmetro, não de usuário.
 * Aqui ficou só o que o nome da tela promete.
 */
export default function UsuariosPage() {
  const { hasMinLevel } = usePermissions();
  const allowed = hasMinLevel(ROLE_LEVEL.administrador);
  const [actionError, setActionError] = useState<string | null>(null);
  const [usersSearch, setUsersSearch] = useState("");
  const debouncedUsersSearch = useDebounce(usersSearch, 300);
  const [usersSorting, setUsersSorting] = useState<DynamicTableSortingState>([
    { id: "title", desc: false },
  ]);

  const userSort = usersSorting[0];
  const fetchUsersPage = useCallback((page: number, signal: AbortSignal) => {
    const sort = userSort?.id === "title"
      ? "email"
      : userSort?.id === "roles"
        ? "role"
        : userSort?.id === "status"
          ? "confirmedAt"
          : "id";
    return fetchUsersApi({
      page,
      search: debouncedUsersSearch,
      sort,
      order: userSort?.desc ? "desc" : "asc",
      signal,
    });
  }, [debouncedUsersSearch, userSort?.desc, userSort?.id]);
  const users = usePagedResource({
    enabled: allowed,
    queryKey: `${debouncedUsersSearch}|${userSort?.id ?? "id"}|${userSort?.desc ? "desc" : "asc"}`,
    fetchPage: fetchUsersPage,
  });

  // O hook consolidado zera `loadedOnce` sempre que `queryKey` muda (busca ou
  // ordenação), para não exibir "last-good" de outro filtro. Sem esta trava,
  // `initialLoading` voltaria a `true` a cada busca/ordenação e o esqueleto de
  // TELA CHEIA engoliria a tabela e o campo de busca. O esqueleto abaixo é
  // exclusivo da primeira carga.
  //
  // Ajuste de estado durante o render (padrão do próprio hook consolidado, ver
  // `navigation` em use-paged-resource.ts) em vez de useRef: o lint deste
  // projeto (react-hooks/refs) proíbe ler `.current` durante o render.
  const [usuariosJaCarregaram, setUsuariosJaCarregaram] = useState(false);
  if (!usuariosJaCarregaram && users.loadedOnce) {
    setUsuariosJaCarregaram(true);
  }
  const initialLoading = !usuariosJaCarregaram && users.loading && !users.loadedOnce;
  const loadError = users.error;

  const handleRetry = useCallback(() => {
    users.reload();
  }, [users]);

  // Edição real de papel: chama o endpoint do backend e recarrega a lista.
  const handleChangeRole = async (userId: number, role: automationRole) => {
    try {
      await updateUserRole(userId, role);
      users.reload();
    } catch {
      setActionError("Não foi possível atualizar o papel do usuário.");
    }
  };

  // Exclusão real de acesso: hard delete no backend, seguido de reload —
  // mesmo formato try/catch de handleChangeRole.
  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      users.reload();
    } catch {
      setActionError("Não foi possível excluir o acesso do usuário.");
    }
  };

  return (
    <Can minLevel={ROLE_LEVEL.administrador} fallback={<AcessoNegado />}>
      <FeatureBoundary
        fallback={<UsuariosPageSkeleton />}
        recoveryActions={[{ label: "Voltar para a Visão Geral", href: routes.visaoGeral }]}
      >
        <PageShell>
          {/* Havia dois cabeçalhos nesta tela: o <h1> desta página e outro dentro de
              UserManagementTable, cada um com sua descrição. O <h1> duplicado saiu
              (dois h1 na mesma página) e o subtítulo abaixo funde os dois sentidos —
              o que a tela mostra e o que dá para fazer nela. */}
          <StandardPageHeader
            page="usuarios"
            className="mb-0"
          />

          <div className="flex flex-col gap-6">
            {initialLoading ? (
              // Esqueleto no lugar do spinner: reserva a tabela com as colunas
              // que vão chegar, para a tela não pular quando os dados entram.
              <UsuariosDataSkeleton />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={handleRetry} />
            ) : (
              <>
                <UserManagementTable
                  rows={users.rows.map(toUserRow)}
                  onChangeRole={handleChangeRole}
                  onDeleteUser={handleDeleteUser}
                  title="Usuários e permissões"
                  description="Usuários cadastrados e seus perfis de acesso."
                  page={users.page}
                  pageSize={users.pageSize}
                  total={users.total}
                  onPageChange={users.setPage}
                  loading={users.loading || users.refreshing}
                  searchValue={usersSearch}
                  onSearchChange={value => setUsersSearch(value.slice(0, 120))}
                  isSearching={usersSearch !== debouncedUsersSearch}
                  sorting={usersSorting}
                  onSortingChange={setUsersSorting}
                  persistKey="automation:usuarios:tabela"
                  noun={["usuário", "usuários"]}
                />

                {actionError && (
                  <p role="alert" className="text-sm font-medium text-destructive mt-4">{actionError}</p>
                )}
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
          Você não tem permissão para gerenciar usuários. Fale com um administrador se precisar de acesso.
        </p>
      </div>
    </PageShell>
  );
}
