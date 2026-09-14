"use client";

import { AlertTriangle, RefreshCw } from "@/shared/ui/icons";
import { Button } from "@/shared/ui/button";

/**
 * Estado visual de erro para listas que dependem do back-end. Usado quando o
 * servidor não respondeu corretamente — substitui a lista no lugar dela.
 */

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-card border ds-border-destructive bg-destructive/5 px-6 py-16 text-center shadow-card"
    >
      {/* Ícone e título usam `text-destructive` (cromático nos dois modos), não
          `text-destructive-text` — este último resolve #000000 no tema claro e
          só se sustenta sobre fundo tinto do mesmo status. A superfície aqui é
          `bg-destructive/5`, praticamente neutra: com `-text` o triângulo e o
          título saíam pretos. */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div>
        {/* `h2`: o ErrorState substitui o conteúdo inteiro da rota, logo abaixo
            do `h1` do StandardPageHeader. Com `h3` a página ficava h1 → h3 sem
            nenhum h2, e o salto se repetia nas quatro telas que o usam. */}
        <h2 className="font-heading text-base font-bold uppercase tracking-wide text-destructive">
          Não foi possível carregar os pedidos
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm font-medium text-muted-foreground">
          O servidor não respondeu corretamente. Verifique se o back-end está no ar e tente novamente.
        </p>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        // `destructive` é reservado a ação irreversível — "Tentar novamente" não
        // destrói nada, e pintar de vermelho o botão seguro assusta justamente
        // no momento em que o usuário já está inseguro. Mesmo padrão do manager
        // do Ara (`app/error.tsx` usa o primário).
        <Button type="button" onClick={onRetry} className="mt-2 w-auto">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
