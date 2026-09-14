import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type SubtitleProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Papel "eyebrow"/rótulo: caixa alta com tracking largo.
 *
 * É código AUTORAL, por isso mora em `composite/` — `primitives/` é o inventário
 * do que o app usa do design system, um reexport de uma linha por arquivo.
 *
 * Continua local porque o `Typography` do design system não tem variante
 * equivalente — `caption` é o degrau de tamanho certo (0.75rem = `text-xs`) e
 * `color="soft"` é o mesmo `text-muted-foreground`, mas nenhum dos dois traz
 * caixa alta nem letter-spacing, e o DS não expõe token de `tracking`.
 */
const subtitleClassName = "text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground";

export function Subtitle<T extends ElementType = "p">({
  as,
  children,
  className,
  ...props
}: SubtitleProps<T>) {
  const Component = as ?? "p";

  return (
    <Component className={cn(subtitleClassName, className)} {...props}>
      {children}
    </Component>
  );
}
