import type { ReactNode } from 'react';
import type { LucideIcon } from '@/shared/ui/icons';
import { CircleHelp } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
import { CardDescription, CardHeader, CardTitle } from '@/shared/ui/primitives/card';
import { Pressable } from '@/shared/ui/primitives/pressable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip';
import { Typography } from '@/shared/ui/primitives/Typography';

interface ChartCardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  tooltip?: ReactNode;
  /**
   * Cluster à direita, antes do "?": badges de recorte (canal, período). É a
   * única extensão sobre o cabeçalho do manager, que só tem o botão de ajuda.
   */
  actions?: ReactNode;
  /** Extras logo abaixo do cabeçalho (legenda, filtros do próprio card). */
  supportingContent?: ReactNode;
  className?: string;
}

function isInlineTextNode(value: ReactNode): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

/**
 * Cabeçalho padrão dos cards de gráfico: ícone em caixa, título + descrição e
 * um "?" que abre o texto explicativo. Mesma composição do manager do Ara, para
 * os dois painéis lerem igual.
 */
export function ChartCardHeader({
  title,
  description,
  icon: Icon,
  tooltip,
  actions,
  supportingContent,
  className,
}: ChartCardHeaderProps) {
  const titleLabel = typeof title === 'string' ? title : 'este gráfico';
  const tooltipTag = isInlineTextNode(tooltip) ? 'span' : 'div';

  return (
    <CardHeader className={cn('gap-0 border-b ds-border-card pb-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border ds-border-card bg-surface text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 space-y-1">
            <CardTitle className="text-sm font-bold leading-tight sm:text-base">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-sm leading-5">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>

        {actions || tooltip ? (
          <div className="flex shrink-0 items-center gap-2">
            {actions}

            {tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Pressable
                    variant="plain"
                    size="content"
                    aria-label={`Informações sobre ${titleLabel}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ds-border-card text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Pressable>
                </TooltipTrigger>
                <TooltipContent variant="info" side="top" className="max-w-xs">
                  <Typography as={tooltipTag} variant="caption" className="text-inherit">
                    {tooltip}
                  </Typography>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}
      </div>

      {supportingContent ? <div className="mt-3">{supportingContent}</div> : null}
    </CardHeader>
  );
}
