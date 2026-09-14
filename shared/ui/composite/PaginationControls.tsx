import { Button } from "@/shared/ui/button";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  noun?: readonly [string, string];
  loading?: boolean;
}

// O design system não tem paginação numerada (o padrão de lá é scroll infinito
// com `LoadMoreButton`), então este composite é do app. O que vem do DS é o
// BOTÃO: `variant="outline"` já entrega borda, superfície, hover, `disabled:` e
// `focus-visible:ds-focus-ring` — reescrever isso à mão era duplicar o variant.
//
// Sobra só a geometria compacta desta faixa: altura 7, `w-auto` para desfazer o
// `w-full` da base e o raio no formato `rounded-[var(--radius-control)]` (o
// `tailwind-merge` não reconhece `rounded-control` como classe de raio, então a
// forma com token literal é a única que substitui o raio do `size="sm"`). É a
// mesma caixa reservada pelo esqueleto em `skeletons.tsx` (`showPagination`).
const paginationButtonClassName =
  "h-7 w-auto rounded-[var(--radius-control)] px-2.5 text-xs sm:px-3";

function visiblePages(page: number, totalPages: number): Array<number | "ellipsis-start" | "ellipsis-end"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("ellipsis-start");
  for (let value = start; value <= end; value += 1) pages.push(value);
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);
  return pages;
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  setPage,
  noun = ["registro", "registros"],
  loading = false,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const label = totalItems === 1 ? noun[0] : noun[1];
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 bg-muted/30 px-3 py-2.5 sm:px-4">
      <span aria-live="polite" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        Mostrando {firstItem}–{lastItem} de {totalItems} {label}
      </span>
      <nav aria-label="Paginação" className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={paginationButtonClassName}
          disabled={loading || page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        {visiblePages(page, totalPages).map(item => (
          typeof item === "number" ? (
            <Button
              key={item}
              type="button"
              variant={item === page ? "default" : "outline"}
              size="sm"
              className={`${paginationButtonClassName} min-w-7`}
              disabled={loading}
              aria-label={`Ir para a página ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          ) : (
            <span key={item} aria-hidden="true" className="px-1 text-xs text-muted-foreground">
              …
            </span>
          )
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={paginationButtonClassName}
          disabled={loading || page === totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Próxima
        </Button>
      </nav>
    </div>
  );
}
