"use client";

import { usePermissions } from "@/shared/config/auth/permissions";
import type { StandardPageKey } from "@/shared/config/page-metadata";
import {
  CardListSkeleton,
  DataTableSkeleton,
  TextLinesSkeleton,
} from "@/shared/ui/composite/skeletons";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { PageShell } from "@/shared/ui/primitives/page-shell";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

/**
 * Esqueletos das três telas montadas pelo `OrdersList` — molde do
 * `manager-route-loading.tsx` do Ara: cabeçalho de página de verdade (título e
 * botão de voltar não são dado que carrega) e esqueleto só na área que depende
 * do back-end.
 *
 * Pedidos, Histórico e Alertas renderizam o MESMO widget com `activeTab`
 * diferente, então o esqueleto também é um só e escolhe a forma pela aba — cada
 * uma espelhando o que o `orders-list.tsx` de fato desenha ali.
 */

/** Aba do `OrdersList` que cada tela monta. */
type OrdersTab = "abertos" | "historico" | "alertas";

/**
 * Faixas de grade na mesma proporção das larguras do `table-fixed` real.
 * `minmax(0, Nfr)` mantém a proporção declarada nos `<th>` e ainda deixa a
 * coluna encolher em tela estreita, como a tabela verdadeira faz.
 */
const faixas = (...pesos: number[]) => pesos.map((peso) => `minmax(0,${peso}fr)`);

/**
 * Tabela "Aguardando Faturamento", agora um `DynamicTable`: as faixas são as
 * MESMAS larguras em px declaradas em `COLUNAS_AGUARDANDO` no widget — Código
 * Produto (150), Produto (320), Qtd. Total (130), Qtd. Lojas (130), Valor Total
 * (160), Últ. Pedido (150) — mais a coluna de ações do design system, que é
 * fixa em 64px e só existe a partir do nível 20 (sem permissão o widget passa
 * um array de ações vazio e o `DynamicTable` não desenha a coluna).
 */
const COLUNAS_ABERTOS = faixas(150, 320, 130, 130, 160, 150, 64);

/**
 * Tabela do Histórico no mesmo `DynamicTable` das demais listas: Código,
 * Produto, Quantidade, Lojas, Valor e a coluna fixa de Ações (64px).
 */
const COLUNAS_HISTORICO = faixas(150, 320, 130, 130, 160, 64);

/**
 * A página real começa em 25 linhas (o lote do "carregar mais" e o `pageSize`
 * default do Histórico), mas altura de esqueleto não é promessa de quantidade:
 * seis linhas já mostram que vem uma tabela sem encher a tela de caixas cinzas.
 */
const LINHAS_TABELA = 6;

/** Cartão "Status dos Pedidos": título, os dois cartões de etapa e a barra de fluxo. */
function StatusDosPedidosSkeleton() {
  return (
    <div className="rounded-card border ds-border-card bg-card p-6 shadow-card">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-6 w-52 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col rounded-card border ds-border-card p-5"
          >
            <div className="mb-2 flex items-start gap-4">
              {/* Disco do ícone: h-16 w-16, o mesmo do cartão carregado. */}
              <Skeleton className="mt-1 h-16 w-16 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                {/* Contador em text-5xl — a linha mais alta do cartão. */}
                <Skeleton className="mt-1 h-12 w-16" />
              </div>
            </div>
            <TextLinesSkeleton
              className="mt-2"
              lines={3}
              widths={["w-full", "w-full", "w-2/3"]}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-control border ds-border-card p-3.5">
        <Skeleton className="h-5 w-5 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
    </div>
  );
}

/** Os dois cartões de ação (OR sem e com adequação) com a previsão embaixo. */
function AcoesDeOrSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center rounded-card border ds-border-card bg-card p-6"
        >
          {/* Botão de largura cheia e py-6 — 68px de altura no estado carregado. */}
          <Skeleton className="h-[68px] w-full rounded-[var(--radius-control)]" />
          <Skeleton className="mt-4 h-3.5 w-64 max-w-full" />
          <Skeleton className="mt-1.5 h-6 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Cartão "Relação de Pedidos Aguardando Faturamento": cabeçalho com contador,
 * barra de busca/ordenação e a tabela agrupada por produto.
 */
function AguardandoFaturamentoSkeleton() {
  const { hasMinLevel } = usePermissions();
  // A coluna "Ações" da tabela real é a mesma do widget: só do nível 20 pra
  // cima. Ler a permissão aqui mantém esqueleto e tabela com o mesmo número de
  // colunas em qualquer papel.
  const temAcoes = hasMinLevel(20);

  return (
    <div className="mt-3 rounded-card border ds-border-card bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b ds-border-divider pb-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-3 w-96 max-w-full" />
        </div>
        <Skeleton className="h-6 w-32 shrink-0 rounded-full" />
      </div>

      <div className="pt-4">
        {/* A fileira de pílulas de ordenação saiu junto com a tabela manual: o
            `DynamicTable` traz a própria barra de busca no topo (`showToolbar`)
            e ordena pelo cabeçalho. A coluna de ações virou o gatilho "..."
            centralizado.

            O rodapé é `showPagination` — a faixa numerada "Mostrando 1–25 de
            N" com Anterior/números/Próxima, que é o que as listas por produto
            passaram a usar no lugar do "carregar mais". Reservar a forma errada
            aqui faria o conteúdo abaixo saltar na troca: a faixa numerada tem
            ~40px e encosta à direita; a de "carregar mais" empilha contagem e
            botão no centro e passa de 90px. */}
        <DataTableSkeleton
          rows={LINHAS_TABELA}
          columnWidths={temAcoes ? COLUNAS_ABERTOS : COLUNAS_ABERTOS.slice(0, -1)}
          hasActionsColumn={temAcoes}
          actionsColumnShape="menu"
          actionsColumnAlign="center"
          showHeader={false}
          showToolbar
          showPagination
          elevated={false}
        />
      </div>
    </div>
  );
}

/** Aba "abertos" — a tela de Pedidos. */
function PedidosAbertosSkeleton() {
  return (
    <div className="space-y-6">
      <StatusDosPedidosSkeleton />
      <AcoesDeOrSkeleton />
      <AguardandoFaturamentoSkeleton />
    </div>
  );
}

/**
 * Aba "historico" — cartão único com cabeçalho, barra de filtros recolhida,
 * `DynamicTable` com busca e a contagem do rodapé.
 *
 * O painel de filtros expandido não entra: ele nasce fechado, e esqueleto que
 * mostra o que não vem promete uma forma que a tela não vai ter.
 */
function HistoricoSkeleton() {
  const { hasMinLevel } = usePermissions();
  const podeComunicar = hasMinLevel(20);

  return (
    <div className="rounded-card border ds-border-card bg-card p-6 shadow-card">
      <div className="mb-5 flex flex-col gap-4 border-b ds-border-divider pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-3 w-[30rem] max-w-full" />
        </div>
        {/* Botão "Comunicação" — mesma regra de permissão do widget. */}
        {podeComunicar ? (
          <Skeleton className="h-10 w-full shrink-0 rounded-[var(--radius-control)] sm:w-52" />
        ) : null}
      </div>

      <div className="mb-6 space-y-4">
        {/* Barra "Filtros e ordenação" recolhida: rótulo à esquerda, seta à direita. */}
        <div className="flex items-center justify-between rounded-card border ds-border-card bg-card px-4 py-3 shadow-control">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-5 rounded-sm" />
        </div>
      </div>

      {/* O histórico autoritativo por produto também usa cursor keyset. */}
      <DataTableSkeleton
        rows={LINHAS_TABELA}
        columnWidths={COLUNAS_HISTORICO}
        hasActionsColumn
        actionsColumnShape="menu"
        actionsColumnAlign="center"
        showHeader={false}
        showToolbar
        showPagination
        elevated={false}
      />

      <div className="mt-4 flex items-center justify-between border-t ds-border-divider pt-3">
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

/** Cartão de lista lateral (alertas ou comunicações): cabeçalho, itens e rodapé. */
function ListaLateralSkeleton({
  items,
  itemsClassName,
  showFooter = false,
  showFooterAction = false,
}: {
  items: number;
  itemsClassName?: string;
  /** Desenha a faixa do rodapé (borda + espaçamento), com ou sem botão. */
  showFooter?: boolean;
  /** Desenha o botão dentro da faixa — só para quem tem permissão. */
  showFooterAction?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-card border ds-border-card bg-card p-6 shadow-card">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 border-b ds-border-divider pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4.5 w-4.5 shrink-0 rounded-sm" />
            <Skeleton className="h-3.5 w-44 max-w-full" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>

        <CardListSkeleton items={items} className={itemsClassName} />
      </div>

      {/* A FAIXA do rodapé é sempre renderizada, porque no cartão real
          (`recent-communications-card`) o `<div>` com `mt-4 pt-3 border-t`
          também é — só o botão dentro dele está sob `hasMinLevel(20)`. Condicionar
          a faixa inteira deixaria o esqueleto ~29px mais curto para quem não tem
          permissão, e o cartão vizinho subiria ao carregar. */}
      {showFooter ? (
        <div className="mt-4 flex justify-center border-t ds-border-divider pt-3">
          {showFooterAction ? (
            <Skeleton className="h-8 w-64 max-w-full rounded-[var(--radius-control)]" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Aba "alertas" — os dois cartões lado a lado (`PriorityAlertsCard` e
 * `RecentCommunicationsCard`) na mesma grade de duas colunas do widget.
 */
function AlertasSkeleton() {
  const { hasMinLevel } = usePermissions();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ListaLateralSkeleton items={3} />
      {/* O feed de comunicações tem espaçamento próprio (space-y-4) e o atalho
          de nova mensagem no rodapé.

          Três itens nos dois cartões, e NÃO os 25 do lote: o rodapé de "carregar
          mais" das duas listas só existe quando há um segundo lote, e desenhar
          25 caixas cinzas prometeria uma altura que a maioria dos dias não tem —
          esqueleto reserva forma, não quantidade. */}
      <ListaLateralSkeleton
        items={3}
        itemsClassName="space-y-4"
        showFooter
        showFooterAction={hasMinLevel(20)}
      />
    </div>
  );
}

/**
 * Área de dados enquanto os pedidos não chegam. Substitui a lista no lugar
 * dela — a moldura da página (cabeçalho, modais) continua sendo da tela.
 */
export function OrdersListSkeleton({
  activeTab,
  label = "Carregando pedidos do servidor...",
}: {
  activeTab: OrdersTab;
  /** O que o leitor de tela anuncia; sem ele a região viva ficaria muda. */
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-6"
    >
      <span className="sr-only">{label}</span>
      {/* As caixas são decorativas: sem isso o leitor de tela varre dezenas de
          divs vazias antes de chegar ao conteúdo. */}
      <div aria-hidden="true">
        {activeTab === "alertas" ? (
          <AlertasSkeleton />
        ) : activeTab === "historico" ? (
          <HistoricoSkeleton />
        ) : (
          <PedidosAbertosSkeleton />
        )}
      </div>
    </div>
  );
}

/**
 * Tela inteira — o `fallback` do `FeatureBoundary`, que fica FORA do
 * `PageShell` e por isso precisa remontar a moldura da página.
 */
export function OrdersRouteLoading({
  page,
  activeTab,
  label,
}: {
  page: StandardPageKey;
  activeTab: OrdersTab;
  label?: string;
}) {
  return (
    <PageShell>
      <StandardPageHeader page={page} className="mb-0" />
      <div>
        <OrdersListSkeleton activeTab={activeTab} label={label} />
      </div>
    </PageShell>
  );
}
