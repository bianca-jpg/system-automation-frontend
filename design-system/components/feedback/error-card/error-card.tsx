import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Typography } from "../../data-display/typography";

export interface ErrorCardProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: "inline" | "section";
}

/**
 * Reusable surface for user-facing error states.
 *
 * - `variant="inline"` (default): compact card, fits inside a list or detail view.
 * - `variant="section"`: full-width container for empty/error pages.
 *
 * Accessibility: the root has `role="alert"` so screen readers announce the
 * error. `aria-live="polite"` avoids interrupting ongoing speech.
 */
export function ErrorCard({
  title = "Não foi possível carregar",
  description = "Tente novamente em alguns instantes.",
  onRetry,
  retryLabel = "Tentar novamente",
  className,
  variant = "inline",
}: ErrorCardProps) {
  return (
    <Card
      role="alert"
      aria-live="polite"
      data-slot="error-card"
      className={cn(
        "border-destructive/40 bg-destructive/5",
        variant === "section" ? "w-full" : undefined,
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div
          data-slot="error-card-icon"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive-text"
        >
          <AlertTriangle className="size-4" aria-hidden="true" />
        </div>
        <div data-slot="error-card-text" className="min-w-0 flex-1">
          <Typography
            as="h3"
            variant="small"
            className="font-bold text-destructive-text"
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              as="p"
              variant="caption"
              className="mt-1 text-muted-foreground"
            >
              {description}
            </Typography>
          ) : null}
        </div>
      </CardHeader>
      {onRetry ? (
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-slot="error-card-retry"
          >
            {retryLabel}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
