"use client";

import { useMemo } from "react";

import type { Parameter } from "@/entities/parametro/model/types";
import { Pencil, Trash2 } from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/primitives/badge";
import {
  DynamicTable,
  type Action,
  type ColumnConfig,
  type DynamicTableSortingState,
} from "@/shared/ui/primitives/dynamic-table";
import { PaginationControls } from "@/shared/ui/composite/PaginationControls";

/**
 * Tabela de parâmetros da simulação.
 *
 * Vem inteira do design system (`DynamicTable`): a montagem manual com
 * `Table`/`TableHead`/`TableRow` não tinha ordenação, busca nem estado vazio, e
 * repetia à mão o menu "..." que o componente já entrega a partir de `actions`.
 *
 * O que o componente passou a cobrir e antes não existia: clique no cabeçalho
 * ordena (Parâmetro, Tipo e Status), busca por nome/tipo/valor/descrição,
 * contagem de registros e estado vazio. O que existia e foi preservado:
 * formatação de cada célula, o `Badge` de status, o detalhe da coluna
 * "Limites / Opções" e o gating de permissão das ações.
 */

// As colunas não dependem de nenhuma prop, então vivem no módulo: identidade
// estável evita reprocessar `columnByKey`/`tableColumns` (e a normalização de
// ordenação) do DynamicTable a cada render da página.
const COLUNAS: ColumnConfig<Parameter>[] = [
  {
    key: "name",
    label: "Parâmetro",
    width: "220px",
    minWidth: "160px",
    sortable: true,
    render: (param) => (
      <span
        className="block truncate font-medium text-foreground"
        title={param.name}
      >
        {param.name}
      </span>
    ),
  },
  {
    key: "type",
    label: "Tipo",
    width: "130px",
    minWidth: "100px",
    sortable: true,
    render: (param) => (
      <span className="block truncate text-muted-foreground">{param.type}</span>
    ),
  },
  {
    key: "value",
    label: "Valor atual",
    width: "150px",
    minWidth: "110px",
    // Sem ordenação: `value` é texto livre ("5", "10", "Sim"), e a comparação
    // lexicográfica colocaria "10" antes de "5". Um cabeçalho clicável que
    // ordena errado é pior que um cabeçalho fixo.
    sortable: false,
    render: (param) => (
      <span className="block truncate font-medium text-foreground">
        {param.value}
        {param.unit ? (
          <span className="ml-1 text-muted-foreground">{param.unit}</span>
        ) : null}
      </span>
    ),
  },
  {
    key: "limits",
    label: "Limites / Opções",
    width: "190px",
    minWidth: "150px",
    sortable: false,
    // `wrap` para o detalhe caber na segunda linha — o padrão da célula é
    // recortar com reticências numa linha só.
    overflow: "wrap",
    render: (param) => (
      <>
        <span className="block text-foreground">{param.limits}</span>
        {/* Detalhe descritivo da coluna — não é falha, então não usa cor de
            status. */}
        {param.limitsDetail ? (
          <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
            {param.limitsDetail}
          </span>
        ) : null}
      </>
    ),
  },
  {
    key: "description",
    label: "Descrição",
    width: "300px",
    minWidth: "200px",
    sortable: false,
    // Único campo em texto corrido: precisa quebrar linha.
    overflow: "wrap",
    render: (param) => (
      <span className="block text-xs leading-relaxed text-muted-foreground">
        {param.description}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "140px",
    minWidth: "110px",
    sortable: true,
    // O variant acompanha o status. Fixá-lo em `success` pintava de verde
    // qualquer valor — inclusive "Inativo" —, e é justamente nesta coluna, que a
    // migração tornou ordenável, que a diferença fica visível ao usuário.
    // Hoje a API devolve só "Ativo", mas quem confia no fixo quebra em silêncio
    // no dia em que ela devolver outro.
    render: (param) => (
      <Badge
        variant={param.status === "Ativo" ? "success" : "neutral"}
        size="label"
        dot
      >
        {param.status}
      </Badge>
    ),
  },
];

// Busca client-side sobre o que o usuário lê na linha. `limits` e `status`
// ficam de fora de propósito: limites são faixas ("0-100") e status hoje é o
// mesmo valor em toda linha — nenhum dos dois estreita a lista.
const CHAVES_DE_BUSCA: (keyof Parameter)[] = [
  "name",
  "type",
  "value",
  "description",
];

interface ParametrosTableProps {
  parametros: Parameter[];
  /**
   * Administrador+ (nível 40) altera direto. Só muda o RÓTULO da ação: os dois
   * itens abrem os mesmos modais, que criam uma solicitação
   * (POST /change-requests) — quem aprova é o administrador.
   */
  canEdit: boolean;
  /** Gestor (nível 30, sem 40): pode solicitar alteração e exclusão. */
  canRequest: boolean;
  onEdit: (param: Parameter) => void;
  onDelete: (param: Parameter) => void;
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
}

export function ParametrosTable({
  parametros,
  canEdit,
  canRequest,
  onEdit,
  onDelete,
  page = 1,
  pageSize = 25,
  total = parametros.length,
  onPageChange,
  loading = false,
  searchValue,
  onSearchChange,
  isSearching = false,
  sorting,
  onSortingChange,
}: ParametrosTableProps) {
  // Mesma regra que o `Can minLevel={30}` da célula de ações aplicava antes:
  // gestor solicita, administrador altera. A tabela inteira já vive sob esse
  // `Can` na página, então na prática isto é sempre verdadeiro aqui — fica
  // explícito para que a permissão continue amarrada à ação, e não só ao
  // enquadramento da tela. Sem nenhuma ação visível, o DynamicTable desabilita
  // o gatilho "..." da linha.
  const podeAgir = canEdit || canRequest;

  const acoes = useMemo<Action<Parameter>[]>(
    () => [
      {
        label: canEdit ? "Editar" : "Solicitar alteração",
        icon: Pencil,
        show: () => podeAgir,
        onClick: onEdit,
      },
      {
        label: canEdit ? "Excluir" : "Solicitar exclusão",
        icon: Trash2,
        variant: "destructive",
        show: () => podeAgir,
        onClick: onDelete,
      },
    ],
    [canEdit, podeAgir, onEdit, onDelete],
  );

  return (
    <DynamicTable
      data={parametros}
      columns={COLUNAS}
      // A coluna "Ações" (e o menu "...") é montada pelo próprio DynamicTable a
      // partir daqui — não existe DropdownMenu escrito à mão nesta tela.
      actions={acoes}
      // Essa coluna é a sétima: em telas estreitas a tabela rola na horizontal
      // e o menu sairia de vista.
      stickyActions
      searchKeys={CHAVES_DE_BUSCA}
      searchPlaceholder="Buscar por nome, tipo, valor ou descrição..."
      searchLabel="Buscar parâmetros"
      tableLabel="Parâmetros da simulação"
      emptyMessage="Nenhum parâmetro cadastrado."
      rowKey={(param) => param.id}
      getRowLabel={(param) => param.name}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      isSearching={isSearching}
      sorting={sorting}
      onSortingChange={onSortingChange}
      manualSorting={Boolean(onSortingChange)}
      loading={loading}
      hideResultsCount={Boolean(onPageChange)}
      // A contagem já aparece na barra de ferramentas ("Mostrando N
      // registros"); o rodapé repetiria a mesma informação.
      hideEndMessage={Boolean(onPageChange)}
      // Guarda ordenação e busca entre visitas — a tela é de consulta
      // repetida, e reordenar toda vez é atrito puro.
      persistKey="automation:parametros:tabela"
      footerRow={onPageChange ? (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={total}
          setPage={onPageChange}
          loading={loading}
          noun={["parâmetro", "parâmetros"]}
        />
      ) : undefined}
    />
  );
}
