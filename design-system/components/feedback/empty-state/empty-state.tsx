import * as React from "react";

import { cn } from "../../../lib/utils";
import { Typography } from "../../data-display/typography";

export interface EmptyStateProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "card" | "inline" | "dashed";
  size?: "sm" | "md" | "lg";
  headingLevel?: 2 | 3 | 4;
  contentClassName?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  variant = "card",
  size = "md",
  headingLevel = 2,
  className,
  contentClassName,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: EmptyStateProps) {
  const generatedTitleId = React.useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <section
      data-slot="empty-state"
      aria-labelledby={titleId}
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center text-center",
        variant === "card" &&
          "max-w-2xl rounded-[var(--radius-card)] border ds-border-card bg-card shadow-[var(--shadow-card)]",
        variant === "dashed" &&
          "rounded-[var(--radius-card)] border border-dashed ds-border-neutral bg-muted/20",
        size === "sm" && "gap-3 px-4 py-6",
        size === "md" && "gap-4 px-6 py-10",
        size === "lg" && "gap-5 px-8 py-14",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          data-slot="empty-state-icon"
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-[var(--radius-control)] border ds-border-surface bg-background text-primary shadow-xs"
        >
          {icon}
        </div>
      ) : null}
      <div
        data-slot="empty-state-content"
        className={cn("flex max-w-md flex-col items-center gap-2", contentClassName)}
      >
        <Typography
          as={Heading}
          id={ariaLabelledBy ? undefined : generatedTitleId}
          variant="h4"
        >
          {title}
        </Typography>
        {description ? (
          <Typography as="p" variant="small" color="soft">
            {description}
          </Typography>
        ) : null}
        {children}
      </div>
      {action ? (
        <div data-slot="empty-state-action" className="mt-2">
          {action}
        </div>
      ) : null}
    </section>
  );
}

export { EmptyState };
