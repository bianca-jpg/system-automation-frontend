import { cn } from "../../../lib/utils";
import { Spinner } from "../../ui/spinner";

interface PageLoaderProps {
  /**
   * Mensagem customizada a ser exibida abaixo do spinner
   * @default "Carregando..."
   */
  message?: string;

  /**
   * Se true, usa min-h-screen; se false, usa altura completa disponível
   * @default true
   */
  fullScreen?: boolean;

  /**
   * Classe CSS adicional para o container
   */
  className?: string;

  /**
   * Tamanho do spinner
   * @default "h-12 w-12"
   */
  spinnerSize?: string;
}

export function PageLoader({
  message = "Carregando...",
  fullScreen = true,
  className,
  spinnerSize = "h-12 w-12",
}: PageLoaderProps) {
  return (
    <main
      data-slot="page-loader"
      className={cn(
        "bg-background flex items-center justify-center",
        fullScreen && "min-h-screen",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        data-slot="page-loader-content"
        className="text-center flex flex-col items-center gap-4"
      >
        <Spinner className={cn("text-primary", spinnerSize)} />

        {/* Mensagem de loading */}
        {message && <p className="text-lg text-foreground/60">{message}</p>}
      </div>
    </main>
  );
}

// Export do tipo para uso externo
export type { PageLoaderProps };
