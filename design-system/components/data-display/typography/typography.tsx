import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "../../../lib/utils";
import {
  TYPOGRAPHY_COLOR_CLASSES,
  TYPOGRAPHY_ROLE_CLASSES,
  type TypographyColor,
  type TypographyVariant,
} from "./tokens";

export type {
  HeadingTypographyVariant,
  SupportingTypographyVariant,
  TypographyColor,
  TypographyVariant,
} from "./tokens";

type TypographyProps<T extends ElementType = "p"> =
  ComponentPropsWithoutRef<T> & {
    as?: T;
    variant?: TypographyVariant;
    color?: TypographyColor;
    className?: string;
    children: ReactNode;
  };

export const Typography = <T extends ElementType = "p">({
  as,
  variant,
  color = "primary",
  className,
  children,
  ...props
}: TypographyProps<T>) => {
  const Component = as || "p";
  const resolvedVariant = variant ?? "body";

  return (
    <Component
      data-slot="typography"
      className={cn(
        TYPOGRAPHY_ROLE_CLASSES[resolvedVariant],
        TYPOGRAPHY_COLOR_CLASSES[color],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
