import {
  cloneElement,
  createElement,
  isValidElement,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { Typography } from "../typography";

type MetricCardIcon = LucideIcon | ReactNode;

export interface MetricCardProps {
  title: ReactNode;
  value: ReactNode;
  description?: ReactNode | undefined;
  icon?: MetricCardIcon | undefined;
  tooltip?: ReactNode | undefined;
  valueClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  className?: string | undefined;
  headerClassName?: string | undefined;
  contentClassName?: string | undefined;
  titleClassName?: string | undefined;
  children?: ReactNode | undefined;
}

function renderMetricCardIcon(icon: MetricCardIcon | undefined) {
  if (!icon) {
    return null;
  }

  const iconClassName = "h-4 w-4 text-muted-foreground";

  if (isValidElement(icon)) {
    const element = icon as ReactElement<{ className?: string }>;

    return cloneElement(element, {
      className: cn(iconClassName, element.props.className),
    });
  }

  if (
    typeof icon === "function" ||
    (typeof icon === "object" &&
      icon !== null &&
      ("$$typeof" in icon || "render" in icon))
  ) {
    const Icon = icon as ElementType<{ className?: string }>;
    return createElement(Icon, { className: iconClassName });
  }

  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
      {icon}
    </span>
  );
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  tooltip,
  valueClassName,
  descriptionClassName,
  className,
  headerClassName,
  contentClassName,
  titleClassName,
  children,
}: MetricCardProps) {
  const iconNode = renderMetricCardIcon(icon);
  const tooltipLabel =
    typeof title === "string" && title.trim().length > 0
      ? `Informações sobre ${title}`
      : "Informações do indicador";

  return (
    <Card variant="elevated" data-slot="metric-card" className={className}>
      <CardHeader className={cn("pb-2", headerClassName)}>
        <CardTitle
          className={cn(
            "flex items-start justify-between gap-3 text-sm font-medium leading-snug",
            titleClassName,
          )}
        >
          <span className="min-w-0 flex-1" data-slot="metric-card-title">
            {title}
          </span>
          {tooltip && iconNode ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={tooltipLabel}
                  data-slot="metric-card-tooltip-trigger"
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ds-focus-ring "
                >
                  {iconNode}
                </button>
              </TooltipTrigger>
              <TooltipContent variant="info" side="top" className="max-w-xs">
                <Typography
                  as="span"
                  variant="caption"
                  className="text-inherit"
                >
                  {tooltip}
                </Typography>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="shrink-0" data-slot="metric-card-icon">
              {iconNode}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-1", contentClassName)}>
        <Typography
          as="p"
          variant="h3"
          className={valueClassName ?? "font-bold"}
        >
          {value}
        </Typography>
        {description ? (
          <Typography
            as="p"
            variant="caption"
            className={cn("text-muted-foreground", descriptionClassName)}
          >
            {description}
          </Typography>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
