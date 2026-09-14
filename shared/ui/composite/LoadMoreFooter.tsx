"use client";

import { LOAD_MORE_STEP } from "@/shared/hooks/useLoadMore";
import { LoadMoreButton } from "@/shared/ui/primitives/load-more-button";

interface LoadMoreFooterProps {
  /** Quantos itens estão na tela agora. */
  loaded: number;
  /** Quantos existem depois de busca/filtros. */
  total: number;
  onLoadMore: () => void;
  /** Singular e plural do que está sendo contado. */
  noun?: readonly [string, string];
  className?: string;
  id?: string;
  loading?: boolean;
}

/**
 * Rodapé de "carregar mais": a contagem "N de M" e o botão do design system.
 *
 * O botão é o `LoadMoreButton` do DS — nada de reconstruir superfície, hover,
 * `disabled:` ou anel de foco à mão. O que este composite acrescenta é só o par
 * contagem + botão, porque uma lista truncada SEM o denominador esconde do
 * usuário que existe mais coisa (foi exatamente o defeito do antigo
 * `slice(0, 3)` do feed de comunicações).
 *
 * A contagem é `aria-live="polite"`: quem usa leitor de tela clica em "carregar
 * mais" e não tem nenhum outro sinal de que a lista cresceu — o foco continua no
 * botão e as linhas novas entram fora do fluxo de leitura.
 *
 * A moldura (borda, fundo) é de quem chama: dentro do `DynamicTable` o
 * `footerRow` já vem numa faixa com `border-t`, e nos cartões o rodapé mora
 * dentro do `CardContent`.
 */
export function LoadMoreFooter({
  loaded,
  total,
  onLoadMore,
  noun = ["registro", "registros"] as const,
  className,
  id,
  loading = false,
}: LoadMoreFooterProps) {
  const [singular, plural] = noun;
  const restantes = Math.max(0, total - loaded);
  // O rótulo promete o tamanho REAL do próximo lote: no último clique sobram 7,
  // e "Carregar mais 25" seria uma promessa que a lista não cumpre.
  const proximoLote = Math.min(LOAD_MORE_STEP, restantes);

  return (
    <div
      id={id}
      className={`flex flex-col items-center gap-2.5 ${className ?? ""}`}
    >
      <span
        aria-live="polite"
        className="text-xs font-medium text-muted-foreground"
      >
        Mostrando {loaded} de {total} {total === 1 ? singular : plural}
      </span>

      {restantes > 0 ? (
        <LoadMoreButton
          onClick={onLoadMore}
          loading={loading}
          loadingLabel={`Carregando mais ${proximoLote}`}
        >
          Carregar mais {proximoLote}
        </LoadMoreButton>
      ) : null}
    </div>
  );
}
