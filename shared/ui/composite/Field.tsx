import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Label } from "@/shared/ui/label";

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  labelClassName?: string;
}

/**
 * Rótulo do campo: `Label` do design system.
 *
 * Antes passava pelo `Subtitle` (helper local de tipografia, papel "eyebrow":
 * caixa alta com tracking largo) e TODO call site precisava desfazer o estilo
 * com um `labelClassName` fixo — o sintoma clássico de componente errado por
 * baixo. `leading-6` é o único acréscimo ao `Label`: preserva a altura de linha
 * que os formulários já tinham (o DS entrega `leading-none`).
 */
function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label className={cn("block leading-6 text-foreground", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  children,
  className,
  labelClassName,
  ...props
}: FieldProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {label ? (
        <div className="space-y-1">
          <FieldLabel htmlFor={htmlFor} className={labelClassName}>
            {label}
          </FieldLabel>
        </div>
      ) : null}
      {children}
    </div>
  );
}
