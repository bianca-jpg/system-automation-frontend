"use client";

// packages/design-system/components/feedback/feature-boundary/feature-boundary.tsx
// Plan 38-6 Task 3 — DS-canonical FeatureBoundary (Phase 36 D-fb-01 promotion).
//
// Composes react-error-boundary's `ErrorBoundary` OUTSIDE a `Suspense` so that:
//   1. Render-throw errors below are caught by the local ErrorBoundary (recoverable)
//   2. Suspense fallback (loading skeleton) renders during data-fetch suspends
//   3. Errors thrown ABOVE the Suspense boundary still propagate to app/error.tsx
//
// Per D-fb-01, the Suspense `fallback` is REQUIRED — every consumer must pass a
// feature-coupled skeleton (no `<p>Carregando…</p>` placeholders allowed).
//
// The default error fallback uses semantic tokens only (no hardcoded colors) and
// matches the visual language of `apps/<app>/app/error.tsx` (Typography + button
// + Link recovery actions). Recovery actions are configurable per consumer.
//
// Apps wrap this with app-specific defaults (recoveryActions, logError sink) —
// see `apps/manager/components/feature-boundary.tsx` and
// `apps/candidate/components/feature-boundary.tsx`.
//
// The user-facing fallback NEVER renders raw error messages or stack traces —
// only a generic localized message — to mitigate information disclosure
// (T-36-1-03 / T-37-1-03).

import { Suspense, type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import Link from "next/link";

import { cn } from "../../../lib/utils";
import { Typography } from "../../data-display/typography";
import { Button, buttonVariants } from "../../ui/button";

export type RecoveryAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ErrorFallbackComponent = (
  props: FallbackProps & { recoveryActions?: RecoveryAction[] | undefined },
) => ReactNode;

export interface FeatureBoundaryProps {
  children: ReactNode;
  /** Suspense fallback. REQUIRED per D-fb-01 — must be a feature-coupled skeleton. */
  fallback: ReactNode;
  /** Optional recovery action buttons for the default error fallback. */
  recoveryActions?: RecoveryAction[] | undefined;
  /** Override the default error fallback UI for this feature. */
  errorFallbackComponent?: ErrorFallbackComponent | undefined;
  /**
   * Callback invoked when the ErrorBoundary catches an error. Apps wire this
   * to their `logError` sink — DS stays sink-agnostic. Error is `unknown`
   * because React error boundaries do not narrow thrown values to Error.
   */
  onError?:
    | ((error: unknown, info: { componentStack?: string | null }) => void)
    | undefined;
}

function RecoveryButton({ action }: { action: RecoveryAction }) {
  if (action.href) {
    return (
      <Link
        href={action.href}
        className={cn(buttonVariants({ variant: "outline" }), "w-auto")}
      >
        {action.label}
      </Link>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      onClick={action.onClick}
      className="w-auto"
    >
      {action.label}
    </Button>
  );
}

function DefaultErrorFallback({
  resetErrorBoundary,
  recoveryActions,
}: FallbackProps & { recoveryActions?: RecoveryAction[] | undefined }) {
  const actions = recoveryActions ?? [];
  return (
    <div
      role="alert"
      data-slot="feature-boundary-error"
      className="flex flex-col items-center justify-center gap-4 bg-background p-8 text-foreground"
    >
      <div className="flex flex-col items-center text-center text-primary gap-2 max-w-md">
        <Typography as="h2" variant="h3" className="font-bold text-foreground">
          Não foi possível carregar esta seção
        </Typography>
        <Typography variant="body" className="text-muted-foreground">
          Tente novamente em alguns instantes.
        </Typography>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button type="button" onClick={resetErrorBoundary} className="w-auto">
            Tentar novamente
          </Button>
          {actions.map((action) => (
            <RecoveryButton key={action.label} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureBoundary({
  children,
  fallback,
  recoveryActions,
  errorFallbackComponent,
  onError,
}: FeatureBoundaryProps) {
  const ErrorFallbackComponentResolved =
    errorFallbackComponent ?? DefaultErrorFallback;

  return (
    <ErrorBoundary
      FallbackComponent={(fallbackProps) => (
        <ErrorFallbackComponentResolved
          {...fallbackProps}
          recoveryActions={recoveryActions}
        />
      )}
      {...(onError
        ? {
            onError: (
              error: unknown,
              info: { componentStack?: string | null },
            ) =>
              onError(error, {
                componentStack: info.componentStack ?? null,
              }),
          }
        : {})}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
