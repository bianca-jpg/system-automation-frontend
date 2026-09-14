import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { Card } from "@/shared/ui/primitives/card";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

/**
 * Composáveis de esqueleto de carregamento — molde do `surface-skeletons.tsx` do
 * manager do Ara.
 *
 * A regra é uma só: o esqueleto imita a FORMA do conteúdo que vai chegar. Um
 * spinner centralizado não diz nada sobre o que está vindo e faz a tela pular
 * quando o conteúdo entra; o esqueleto reserva o espaço certo e a transição fica
 * estável.
 *
 * Peso visual e animação vêm do `Skeleton` do design system — nada de cor ou
 * `animate-pulse` próprio aqui.
 *
 * A MOLDURA também vem do design system: onde o conteúdo real é um `Card`
 * (`variant="elevated"` — é o que o `MetricCard` do DS usa por dentro e o que os
 * cartões de gráfico do app usam), o esqueleto é o mesmo `Card`. Redesenhar a
 * casca à mão fazia o esqueleto e o conteúdo divergirem assim que a superfície
 * do `Card` mudasse — exatamente a tela pulando que o esqueleto existe para
 * evitar.
 */

/**
 * Cabeçalho de página — mesma geometria do `PageHeader` do design system: botão
 * de voltar redondo à esquerda, título ao lado e divisor embaixo.
 *
 * Use só onde o título ainda é desconhecido — o caso do `loading.tsx` do grupo
 * de rotas, que serve todas as telas. Quando a tela é conhecida, renderize o
 * `StandardPageHeader` de verdade: cabeçalho não é dado que carrega.
 */
export function PageHeaderSkeleton({
  withBackButton = true,
  className,
}: {
  withBackButton?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-5 border-b ds-border-neutral pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3">
          {withBackButton ? (
            // Mesmo recuo do slot de navegação do PageHeader (`self-start pt-1`).
            <div className="flex shrink-0 items-center self-start pt-1">
              <Skeleton className="size-9 rounded-full" />
            </div>
          ) : null}
          {/* Altura do título acompanha o h1 do DS: 2rem, 2.5rem a partir de md. */}
          <Skeleton className="h-10 w-56 max-w-full md:h-12 md:w-72" />
        </div>
      </div>
    </div>
  );
}

/** Linha de texto solta, para títulos e parágrafos. */
export function TextLinesSkeleton({
  lines = 3,
  widths = [],
  className,
}: {
  lines?: number;
  widths?: string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", widths[index] ?? widths[0] ?? "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * Cartão de indicador — espelha o `MetricCard` do design system: título curto em
 * cima à esquerda, ícone no canto superior direito, valor grande embaixo.
 *
 * `showDescription` reserva a legenda de apoio (o `description` do MetricCard);
 * fica desligada por padrão porque nem todo indicador tem uma.
 */
function MetricCardSkeleton({
  showDescription = false,
  extraLine = false,
}: {
  showDescription?: boolean;
  /**
   * Reserva a linha que o `MetricCard` renderiza a partir de `children`, depois
   * da descrição. É o cartão MAIS ALTO que define a altura da linha na grade —
   * sem essa reserva a faixa inteira encolhe durante o carregamento.
   */
  extraLine?: boolean;
}) {
  return (
    // `p-6` desfaz o `py-6` da base do Card e devolve o mesmo respiro do
    // MetricCard real (Card `py-6` + CardHeader/CardContent `px-6`).
    <Card variant="elevated" className="p-6">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      {showDescription ? <Skeleton className="mt-2 h-3 w-24" /> : null}
      {extraLine ? <Skeleton className="mt-1 h-3 w-36" /> : null}
    </Card>
  );
}

/** Grade de indicadores, na mesma grade dos cartões reais. */
export function MetricGridSkeleton({
  cards = 4,
  className,
  showDescription = false,
  firstCardExtraLine = false,
}: {
  cards?: number;
  className?: string;
  showDescription?: boolean;
  /** Só o primeiro cartão traz `children` no uso atual (ver CurrentCollectionMetrics). */
  firstCardExtraLine?: boolean;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <MetricCardSkeleton
          key={index}
          showDescription={showDescription}
          extraLine={firstCardExtraLine && index === 0}
        />
      ))}
    </div>
  );
}

/**
 * Barras horizontais — molde do `HorizontalBarChart` do design system: rótulo e
 * valor na mesma linha, trilho arredondado embaixo.
 *
 * Vive solto (e não só dentro do `ChartCardSkeleton`) porque um cartão pode
 * trazer mais de uma distribuição lado a lado, como o "Desempenho de Pedidos"
 * da visão geral.
 */
export function BarListSkeleton({ bars = 5 }: { bars?: number }) {
  // Comprimentos fixos, não aleatórios: `Math.random()` a cada render faria o
  // esqueleto "dançar" e divergir entre servidor e cliente.
  const larguras = ["w-11/12", "w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-5/6"];

  return (
    <div className="space-y-4">
      {Array.from({ length: bars }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-40 max-w-[60%]" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton
            className={cn("h-2.5 rounded-full", larguras[index % larguras.length])}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Cartão de gráfico — cabeçalho no molde do `ChartCardHeader` (ícone em caixa à
 * esquerda, título e descrição) e, no corpo, barras de comprimento variado.
 *
 * - `showActions` reserva o chip de recorte (canal, período) que alguns
 *   cabeçalhos trazem à esquerda do "?".
 * - `children` é o corpo do cartão, na forma do gráfico real (barras, colunas
 *   lado a lado, destaque antes das barras).
 */
export function ChartCardSkeleton({
  showActions = false,
  className,
  children,
}: {
  showActions?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    // `py-0`: o respiro vertical já vem do `p-6` do cabeçalho e do corpo, como
    // no cartão de gráfico real.
    <Card variant="elevated" className={cn("py-0", className)}>
      <div className="flex items-start gap-3 border-b ds-border-card p-6 pb-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-control)]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        {/* Mesma caixa do Badge `size="label"`: h-6 e cantos redondos. */}
        {showActions ? <Skeleton className="h-6 w-28 shrink-0 rounded-full" /> : null}
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      </div>

      <div className="p-6 pt-4">{children}</div>
    </Card>
  );
}

/**
 * Título de seção que fica FORA da moldura da tabela.
 *
 * O `DynamicTable` do design system traz a própria moldura (`Card`) e o topo
 * dela é a barra de busca — não sobra lugar para o título da seção dentro. Nas
 * telas migradas o título passou a viver acima do cartão, e o esqueleto precisa
 * reservá-lo no mesmo lugar, senão a tela desliza uma faixa inteira quando os
 * dados chegam.
 */
export function SectionHeadingSkeleton({
  withIcon = false,
}: {
  withIcon?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {withIcon ? (
        <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-control)]" />
      ) : null}
      <div>
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="mt-2 h-3 w-80 max-w-full" />
      </div>
    </div>
  );
}

/**
 * Tabela — cabeçalho da seção, cabeçalho de colunas e linhas. `columns` deve
 * bater com a tabela real para o esqueleto não mudar a largura ao carregar.
 *
 * As chaves opcionais existem porque as tabelas do app não têm todas a mesma
 * moldura, e uma moldura que não bate com a real desloca o conteúdo na hora da
 * troca:
 * - `hasActionsColumn`: quando a última coluna é o menu "..." da linha, ela
 *   vira um quadrado à direita; quando é conteúdo (Observações, por exemplo),
 *   segue como célula de texto.
 * - `actionsColumnShape`: a forma dessa última coluna — o gatilho "..."
 *   (`menu`) ou o botão em pílula das tabelas de pedidos (`button`).
 * - `columnWidths`: as faixas de coluna da tabela real, quando ela é
 *   `table-fixed` com largura declarada por coluna. Com elas o esqueleto vira
 *   uma grade nas MESMAS proporções (ex.: `minmax(0,14fr)`); sem elas, a
 *   primeira coluna cresce e as demais ficam fixas.
 * - `showToolbar`: a barra de busca + contagem que o `DynamicTable` do design
 *   system renderiza no topo do cartão. Nas tabelas migradas para ele, o título
 *   da seção sai de dentro da moldura (use `showHeader={false}` + o
 *   `SectionHeadingSkeleton` acima) e esta barra ocupa o lugar.
 * - `showFooter`: rodapé de contagem ("Visualizando N de N linhas").
 * - `showPagination`: rodapé de paginação (página atual + Anterior/Próxima),
 *   que nas listas de pedidos fica DENTRO da moldura da tabela.
 * - `showLoadMore`: o rodapé de "carregar mais" (contagem "N de M" e o botão),
 *   que é o `footerRow` do `DynamicTable`. É a forma das listas da aba
 *   "abertos"; a numerada acima é a do Histórico.
 * - `elevated`: desligue quando a tabela real mora dentro de outro cartão — lá
 *   a moldura interna tem borda, mas não sombra.
 */
export function DataTableSkeleton({
  rows = 6,
  columns = 5,
  columnWidths,
  showHeader = true,
  hasActionsColumn = true,
  actionsColumnShape = "menu",
  actionsColumnAlign = "right",
  showToolbar = false,
  showFooter = false,
  showPagination = false,
  showLoadMore = false,
  elevated = true,
  className,
}: {
  rows?: number;
  columns?: number;
  columnWidths?: string[];
  showHeader?: boolean;
  hasActionsColumn?: boolean;
  actionsColumnShape?: "menu" | "button";
  /** Lado do gatilho de ações — espelha o alinhamento do `TableHead` real. */
  actionsColumnAlign?: "right" | "center";
  showToolbar?: boolean;
  showFooter?: boolean;
  showPagination?: boolean;
  showLoadMore?: boolean;
  elevated?: boolean;
  className?: string;
}) {
  // Larguras fixas por posição — `Math.random()` faria o esqueleto tremer a cada
  // render e divergir entre servidor e cliente.
  const larguras = ["w-3/4", "w-1/2", "w-2/3", "w-full", "w-3/5"];

  const totalColumns = columnWidths?.length || columns;
  const gridStyle = columnWidths?.length
    ? { gridTemplateColumns: columnWidths.join(" ") }
    : undefined;
  const isActionsCell = (index: number) =>
    hasActionsColumn && index === totalColumns - 1;
  // O gatilho "..." acompanha o alinhamento da coluna real: `text-right` na
  // tabela de usuários, `text-center` na de parâmetros. Alinhar sempre à direita
  // faria o marcador saltar para o centro quando a tabela verdadeira entrasse.
  const actionsShape =
    actionsColumnShape === "button"
      ? "mx-auto h-6 w-24 max-w-full rounded-full"
      : actionsColumnAlign === "center"
        ? "mx-auto h-7 w-7 rounded-md"
        : "ml-auto h-7 w-7 rounded-md";

  return (
    // `elevated` é exatamente a diferença entre os dois variants de superfície do
    // Card: `elevated` traz a sombra, `default` é a mesma caixa sem sombra (para
    // a tabela que mora dentro de outro cartão). `py-0` porque o respiro vem das
    // faixas internas.
    <Card
      variant={elevated ? "elevated" : "default"}
      className={cn("overflow-hidden py-0", className)}
    >
      {showHeader ? (
        <div className="flex items-center gap-3 border-b ds-border-divider bg-surface p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-control)]" />
          <div>
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          </div>
        </div>
      ) : null}

      {showToolbar ? (
        // Mesma geometria do topo do `DynamicTable`: campo de busca de 48px
        // (`h-12`, cantos `rounded-2xl`) e, abaixo, a linha viva de contagem
        // ("Mostrando N registros").
        <div className="flex flex-col gap-3 border-b ds-border-divider px-4 py-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
      ) : null}

      {gridStyle ? (
        // Grade nas mesmas faixas do `table-fixed` real: cada coluna guarda a
        // largura que vai receber, então nada se desloca quando os dados chegam.
        <>
          <div
            className="grid border-b ds-border-divider bg-muted/50"
            style={gridStyle}
          >
            {Array.from({ length: totalColumns }).map((_, index) => (
              <div key={index} className="px-3 py-3">
                <Skeleton
                  className={cn(
                    "h-3 max-w-full",
                    isActionsCell(index) ? "mx-auto w-14" : "w-20",
                  )}
                />
              </div>
            ))}
          </div>

          <div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid items-center border-b ds-border-skeleton last:border-b-0"
                style={gridStyle}
              >
                {Array.from({ length: totalColumns }).map((_, colIndex) => (
                  <div key={colIndex} className="px-3 py-3">
                    <Skeleton
                      className={cn(
                        isActionsCell(colIndex)
                          ? actionsShape
                          : cn(
                              "h-4",
                              larguras[(rowIndex + colIndex) % larguras.length],
                            ),
                      )}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4 border-b ds-border-divider bg-muted/50 px-4 py-3">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn("h-3", index === 0 ? "w-40 flex-1" : "w-24")}
              />
            ))}
          </div>

          <div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center gap-4 border-b ds-border-skeleton px-4 py-4 last:border-b-0"
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton
                    key={colIndex}
                    className={cn(
                      "h-4",
                      colIndex === 0 ? "w-48 flex-1" : "w-20",
                      // Última coluna é a de ações: reserva o gatilho da linha.
                      isActionsCell(colIndex) ? actionsShape : "",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {showPagination ? (
        // Mesma faixa do `PaginationControls`: contagem à direita e os dois
        // botões de navegação.
        // O `data-slot` identifica QUAL rodapé foi reservado: é o que separa uma
        // tabela de paginação numerada de uma de "carregar mais" sem depender de
        // classe do Tailwind num teste.
        <div
          data-slot="table-skeleton-pagination"
          className="flex flex-wrap items-center justify-end gap-3 border-t ds-border-divider bg-muted/30 px-3 py-2.5 sm:px-4"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20 rounded-[var(--radius-control)]" />
          <Skeleton className="h-7 w-20 rounded-[var(--radius-control)]" />
        </div>
      ) : null}

      {showLoadMore ? (
        // Mesma faixa do `footerRow` do `DynamicTable` (`border-t` + `px-4 py-4`)
        // com o conteúdo do `LoadMoreFooter`: a contagem "N de M" em cima e o
        // `LoadMoreButton` embaixo — largura cheia no mobile, ~10rem a partir de
        // `sm`, que é o que o botão do design system reserva.
        <div
          data-slot="table-skeleton-load-more"
          className="flex flex-col items-center gap-2.5 border-t ds-border-divider px-4 py-4"
        >
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-control)] sm:w-40" />
        </div>
      ) : null}

      {showFooter ? (
        <div className="border-t ds-border-divider bg-surface/50 p-4">
          <Skeleton className="h-3.5 w-48 max-w-full" />
        </div>
      ) : null}
    </Card>
  );
}

/** Lista de cartões empilhados (alertas, comunicações). */
export function CardListSkeleton({
  items = 3,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-control border ds-border-card p-4"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
