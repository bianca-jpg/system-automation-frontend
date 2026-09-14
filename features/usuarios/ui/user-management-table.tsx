"use client";

import { useMemo, useState } from "react";
import type { automationRole } from "@/shared/config/auth/automation-roles";
import type { ParametroRequestRow } from "@/entities/parametro/model/types";
import type { UsuarioRow } from "@/entities/usuario/model/types";
import { chaveOrdenacaoDataBr } from "@/shared/lib/format/data-br";
import { Badge } from "@/shared/ui/primitives/badge";
import type { BadgeVariant } from "@/shared/ui/primitives/badge";
import {
  DynamicTable,
  type Action,
  type ColumnConfig,
  type DynamicTableSortingState,
} from "@/shared/ui/primitives/dynamic-table";
import { Eye, ShieldCheck } from "@/shared/ui/icons";
import { PaginationControls } from "@/shared/ui/composite/PaginationControls";
import { ChangeRoleModal } from "./change-role-modal";
// UserTableRow é uma composição de dois tipos de domínio independentes
// (ParametroRequestRow e UsuarioRow, cada um definido em seu próprio entities/),
// não mais um tipo único fundindo os dois. A união em si só existe aqui, na
// camada de apresentação desta tabela — que é a única coisa no app que
// legitimamente precisa renderizar as duas coisas juntas.
export type UserTableRow =
  | ({ kind: "request" } & ParametroRequestRow)
  | ({ kind: "user" } & UsuarioRow);

/** Célula sem valor para o tipo de linha (a coluna existe para o outro tipo). */
const SEM_VALOR = "—";

function rotuloStatus(row: UserTableRow): string {
  if (row.kind === "request") return "SOLICITAÇÃO";
  return row.confirmedAt ? "CONFIRMADO" : "AGUARDANDO CONFIRMAÇÃO";
}

function varianteStatus(row: UserTableRow): BadgeVariant {
  if (row.kind === "request") return "warning";
  return row.confirmedAt ? "neutral" : "warning";
}

function rotuloPapeis(row: UserTableRow): string {
  if (row.kind === "request") return SEM_VALOR;
  return row.roles.length ? row.roles.join(", ") : "Sem papel atribuído";
}

// Fora do componente: o `DynamicTable` memoiza colunas/filtros por identidade, e
// recriar este array a cada render invalidaria a tabela inteira (ordenação e
// dimensionamento incluídos). Nenhuma coluna depende de prop.
const COLUNAS: ColumnConfig<UserTableRow>[] = [
  {
    key: "title",
    label: "Nome / E-mail",
    width: "300px",
    minWidth: "220px",
    // Duas linhas na célula (nome + tipo da solicitação): o recorte padrão é de
    // uma linha só e cortaria o subtítulo.
    overflow: "wrap",
    sortable: true,
    sortAccessor: (row) => row.title,
    filterAccessor: (row) =>
      row.kind === "request" ? `${row.title} ${row.subtitle}` : row.title,
    render: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground" title={row.title}>
          {row.title}
        </div>
        {row.kind === "request" && (
          <div
            className="truncate text-xs text-muted-foreground"
            title={row.subtitle}
          >
            {row.subtitle}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "roles",
    label: "Papéis",
    width: "220px",
    minWidth: "160px",
    sortable: true,
    // Linha de solicitação não tem papel: ordena para o começo em vez de
    // ordenar pelo travessão exibido.
    sortAccessor: (row) => (row.kind === "user" ? rotuloPapeis(row) : ""),
    filterAccessor: (row) => (row.kind === "user" ? rotuloPapeis(row) : ""),
    render: (row) => (
      <span className="text-muted-foreground">{rotuloPapeis(row)}</span>
    ),
  },
  {
    key: "date",
    label: "Data",
    width: "180px",
    minWidth: "140px",
    sortable: true,
    // A data chega formatada em pt-BR; ordenar o texto ordenaria pelo dia.
    sortAccessor: (row) =>
      row.kind === "request" ? chaveOrdenacaoDataBr(row.date) : "",
    filterAccessor: (row) => (row.kind === "request" ? row.date : ""),
    render: (row) => (
      <span className="text-muted-foreground">
        {row.kind === "request" ? row.date : SEM_VALOR}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "240px",
    minWidth: "180px",
    sortable: true,
    sortAccessor: rotuloStatus,
    filterAccessor: rotuloStatus,
    render: (row) => (
      <Badge variant={varianteStatus(row)} size="compact">
        {rotuloStatus(row)}
      </Badge>
    ),
  },
  {
    key: "requester",
    label: "Solicitante",
    width: "200px",
    minWidth: "150px",
    sortable: true,
    sortAccessor: (row) => (row.kind === "request" ? row.requester : ""),
    filterAccessor: (row) => (row.kind === "request" ? row.requester : ""),
    render: (row) => (
      <span className="text-muted-foreground">
        {row.kind === "request" ? row.requester : SEM_VALOR}
      </span>
    ),
  },
];

const CHAVES_BUSCA = ["title", "roles", "date", "status", "requester"];

interface UserManagementTableProps {
  rows: UserTableRow[];
  onSelectParameterRequest?: (parameterRequestId: number) => void;
  onChangeRole?: (userId: number, role: automationRole) => void;
  onDeleteUser?: (userId: number) => void;
  title?: string;
  description?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number | ((current: number) => number)) => void;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isSearching?: boolean;
  sorting?: DynamicTableSortingState;
  onSortingChange?: (sorting: DynamicTableSortingState) => void;
  persistKey?: string;
  noun?: readonly [string, string];
}

/** Linha de usuário selecionada para troca de papel (alimenta o modal). */
interface RoleEditTarget {
  userId: number;
  userLabel: string;
  currentRole: string | null;
}

export function UserManagementTable({
  rows,
  onSelectParameterRequest,
  onChangeRole,
  onDeleteUser,
  title = "Lista de Usuários e Permissões (Incluindo Solicitações Pendentes)",
  description = "Visualização de todos os usuários cadastrados e seus perfis de acesso.",
  page = 1,
  pageSize = 25,
  total = rows.length,
  onPageChange,
  loading = false,
  searchValue,
  onSearchChange,
  isSearching = false,
  sorting,
  onSortingChange,
  persistKey,
  noun = ["registro", "registros"],
}: UserManagementTableProps) {
  // O alvo e a abertura são estados separados de propósito. Se o Dialog fosse
  // montado/desmontado junto com o alvo, o FocusScope do Radix não teria para
  // onde devolver o foco ao fechar (o item do menu que o abriu já saiu do DOM)
  // e o foco cairia no <body>. Mantendo o Dialog montado, o Radix devolve o
  // foco ao gatilho "Abrir ações" da linha.
  const [roleEditTarget, setRoleEditTarget] = useState<RoleEditTarget | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Um menu "..." por linha, com o item do TIPO daquela linha — é o `show` que
  // separa solicitação de usuário, no lugar dos dois blocos de <DropdownMenu>
  // que a tabela montava à mão.
  const acoes = useMemo<Action<UserTableRow>[]>(
    () => [
      {
        label: "Ver solicitação",
        icon: Eye,
        show: (row) => row.kind === "request",
        // Sem handler a ação não tem o que fazer — antes ela ficava clicável e
        // silenciosamente inerte.
        disabled: () => !onSelectParameterRequest,
        disabledReason: () =>
          onSelectParameterRequest
            ? undefined
            : "Abertura de solicitação indisponível nesta tela.",
        onClick: (row) => {
          if (row.kind === "request") onSelectParameterRequest?.(row.parameterRequestId);
        },
      },
      {
        label: "Alterar papel",
        icon: ShieldCheck,
        show: (row) => row.kind === "user",
        disabled: () => !onChangeRole,
        disabledReason: () =>
          onChangeRole ? undefined : "Troca de papel indisponível nesta tela.",
        onClick: (row) => {
          if (row.kind !== "user") return;
          setRoleEditTarget({
            userId: row.id,
            userLabel: row.title,
            currentRole: row.roles[0] ?? null,
          });
          setIsRoleModalOpen(true);
        },
      },
    ],
    [onChangeRole, onSelectParameterRequest],
  );

  // Sem `onRowClick`, de propósito. O `DynamicTable` decide a interatividade da
  // linha por TABELA, não por linha (`isRowInteractive = typeof onRowClick ===
  // "function"`), e aplica `tabIndex={0}` mais `aria-label="Abrir registro X"`
  // em TODAS. Como esta tabela mistura solicitações (que abrem detalhe) com
  // usuários (que não abrem), passar o handler faria cada linha de usuário
  // virar uma parada de tabulação anunciando uma ação que o guard descarta.
  //
  // A solicitação continua alcançável — e melhor rotulada — pelo item
  // "Ver solicitação" do menu "...", que é focável e tem nome acessível.
  //
  // A correção de raiz é interatividade por linha no design system, que é
  // read-only aqui. Vale reportar ao time do DS.

  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="text-base font-bold uppercase tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <DynamicTable
        data={rows}
        columns={COLUNAS}
        actions={acoes}
        stickyActions
        searchKeys={CHAVES_BUSCA}
        searchPlaceholder="Buscar por nome, e-mail, papel ou solicitante..."
        searchLabel="Buscar usuários e solicitações"
        tableLabel="Usuários e solicitações de parâmetros"
        emptyMessage="Nenhum usuário ou solicitação encontrado"
        rowKey={(row) => (row.kind === "request" ? row.id : `user-${row.id}`)}
        getRowLabel={(row) => row.title}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        isSearching={isSearching}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting={Boolean(onSortingChange)}
        loading={loading}
        hideResultsCount={Boolean(onPageChange)}
        hideEndMessage={Boolean(onPageChange)}
        persistKey={persistKey}
        footerRow={onPageChange ? (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalItems={total}
            setPage={onPageChange}
            loading={loading}
            noun={noun}
          />
        ) : undefined}
      />

      {/* Um único modal para a tabela inteira: o alvo vem do estado, não da
          linha, para não montar um Dialog por linha renderizada. Fica montado o
          tempo todo (ver comentário do estado) e o alvo só é descartado quando
          outro usuário é escolhido — não ao fechar. */}
      <ChangeRoleModal
        // Trocar de alvo remonta o modal, para a escolha de um usuário nunca
        // aparecer pré-selecionada no formulário de outro. Reabrir o MESMO
        // usuário não remonta; nesse caso quem zera a escolha é o ajuste por
        // `open` dentro do próprio modal.
        key={roleEditTarget?.userId ?? "sem-alvo"}
        open={isRoleModalOpen}
        onOpenChange={setIsRoleModalOpen}
        userLabel={roleEditTarget?.userLabel ?? ""}
        currentRole={roleEditTarget?.currentRole ?? null}
        onConfirm={(role) => {
          if (roleEditTarget) onChangeRole?.(roleEditTarget.userId, role);
        }}
        onDelete={
          onDeleteUser && roleEditTarget
            ? () => onDeleteUser(roleEditTarget.userId)
            : undefined
        }
      />
    </div>
  );
}
