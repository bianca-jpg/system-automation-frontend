import { cva, type VariantProps } from "class-variance-authority";

/**
 * Drift cleanup (Pitfall #3, Plan 35-4):
 * - `rose` was `ds-border-destructive bg-rose-50/75 text-rose-700 dark:ds-border-destructive dark:bg-rose-500/10 dark:text-rose-200`
 *   (palette default rose-50/rose-700 + rose-500/rose-200 in dark) → semantic destructive family
 * - `sky` was `ds-border-info bg-sky-50/75 text-sky-700 dark:ds-border-info dark:bg-sky-500/10 dark:text-sky-200`
 *   (palette default sky-50/sky-700 + sky-500/sky-200 in dark) → semantic info family
 * - `neutral` was `ds-border-neutral bg-slate-50/80 text-slate-700 dark:ds-border-neutral dark:bg-muted/30 dark:text-foreground`
 *   (palette default slate-50/slate-700 in light) → muted/foreground semantic
 *
 * Visual diff is INTENTIONAL — D-color-01 preserves brand semantics, not exact hex.
 */
export const badgeToneClassNames = {
  default: "ds-border-control-strong bg-muted/30 text-muted-foreground",
  success: "ds-border-success bg-success/10 text-success-text",
  warning: "ds-border-warning bg-warning/10 text-warning-text",
  destructive: "ds-border-destructive bg-destructive/10 text-destructive-text",
  info: "ds-border-info bg-info/10 text-info-text",
  outline: "ds-border-neutral bg-background/80 text-foreground",
  rose: "ds-border-destructive bg-destructive/10 text-destructive-text dark:ds-border-destructive dark:bg-destructive/15",
  sky: "ds-border-info bg-info/10 text-info-text dark:ds-border-info dark:bg-info/15",
  neutral:
    "ds-border-neutral bg-muted/40 text-foreground dark:ds-border-neutral dark:bg-muted/30 dark:text-foreground",
} as const;

export type BadgeVariant = keyof typeof badgeToneClassNames;

export const badgeVariants = cva(
  // max-w-full + min-w-0: sem isso o badge se dimensiona por max-content e
  // vaza da célula da tabela (que é table-fixed), pintando por cima da coluna
  // vizinha. `shrink-0` fica — removê-lo amassaria badges em toolbars.
  "inline-flex max-w-full min-w-0 shrink-0 items-center justify-center gap-[var(--space-inline-compact)] overflow-hidden rounded-[var(--radius-round)] border text-center font-medium uppercase whitespace-nowrap leading-none transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0  focus-visible:ds-focus-ring  aria-invalid:ds-border-destructive-strong aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: badgeToneClassNames,
      size: {
        compact:
          "h-[1.375rem] min-w-[5.5rem] px-2.5 text-[11px] tracking-[0.1em]",
        content: "h-[1.375rem] px-2.5 text-[11px] tracking-[0.1em]",
        indicator: "h-4 min-w-4 px-1 text-[9px] tracking-[0.08em]",
        status: "h-6 min-w-[6rem] px-2.5 text-[11px] tracking-[0.12em]",
        /* Pill de status para células de tabela: caixa normal e sem largura
           mínima — alinhado à esquerda na coluna, o texto começa sempre no
           mesmo x, sem o vão irregular dos tamanhos com min-width. */
        label:
          "h-6 gap-1.5 px-2.5 text-xs font-medium normal-case tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "compact",
    },
  },
);

export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>["size"]>;
