import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import {
  Typography,
  type HeadingTypographyVariant,
  type SupportingTypographyVariant,
} from "../../data-display/typography";

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  supportingContent?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  navigation?: ReactNode | undefined;
  breadcrumb?: ReactNode | undefined;
  titleAs?: "h1" | "h2" | "h3" | "h4" | undefined;
  titleVariant?: HeadingTypographyVariant | undefined;
  subtitleVariant?: SupportingTypographyVariant | undefined;
  titleOverflow?: "wrap" | "truncate" | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
  contentClassName?: string | undefined;
  actionsClassName?: string | undefined;
}

export function PageHeader({
  title,
  subtitle,
  supportingContent,
  actions,
  navigation,
  breadcrumb,
  titleAs = "h1",
  titleVariant,
  subtitleVariant = "lead",
  titleOverflow = "wrap",
  className,
  titleClassName,
  contentClassName,
  actionsClassName,
}: PageHeaderProps) {
  const resolvedTitleVariant = titleVariant ?? titleAs;

  return (
    <header
      data-slot="page-header"
      className={cn(
        "mb-8 flex flex-col gap-5 border-b ds-border-neutral pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3">
          {navigation ? (
            <div
              data-slot="page-header-navigation"
              className="flex shrink-0 items-center self-start pt-1"
            >
              {navigation}
            </div>
          ) : null}
          <div
            data-slot="page-header-content"
            className={cn("min-w-0 space-y-2", contentClassName)}
          >
            {breadcrumb ? (
              <div data-slot="page-header-breadcrumb" className="pb-0.5">
                {breadcrumb}
              </div>
            ) : null}
            <Typography
              as={titleAs}
              variant={resolvedTitleVariant}
              className={cn(
                "m-0 text-foreground",
                titleOverflow === "truncate" ? "truncate" : "break-words",
                titleClassName,
              )}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant={subtitleVariant}
                color="soft"
                className="max-w-3xl break-words text-pretty"
              >
                {subtitle}
              </Typography>
            ) : null}
            {supportingContent ? (
              <div
                data-slot="page-header-supporting"
                className="flex flex-wrap items-center gap-2 pt-1"
              >
                {supportingContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {actions ? (
        <div
          data-slot="page-header-actions"
          className={cn(
            "flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end",
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
