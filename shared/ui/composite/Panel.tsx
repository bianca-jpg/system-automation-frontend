import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type PanelTone = "default";
type PanelPadding = "none";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  padding?: PanelPadding;
}

// Tons mapeados nas superfícies do design system. Antes estes valores apontavam
// para `--panel*`/`--shadow-panel`, tokens do sistema paralelo que foi removido —
// como não existem mais, o CSS caía em `currentColor`/transparente.
const panelToneClasses: Record<PanelTone, string> = {
  default: "ds-border-card bg-card text-card-foreground shadow-card",
};

const panelPaddingClasses: Record<PanelPadding, string> = {
  none: "p-0",
};

export function Panel({ className, tone = "default", padding = "none", ...props }: PanelProps) {
  return (
    <div
      className={cn(
        // `duration-200` cravava o valor e escapava do bloco
        // `prefers-reduced-motion` de `tokens/motion.css`, que zera os
        // `--motion-duration-*`. O token vale os mesmos 200ms.
        "rounded-card border transition-[background-color,border-color,box-shadow] duration-[var(--motion-duration-standard)] motion-reduce:transition-none",
        panelToneClasses[tone],
        panelPaddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
