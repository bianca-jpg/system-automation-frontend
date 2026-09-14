// FeatureBoundary stories — documents the "Suspense fallback identity"
// convention used by Next.js apps (manager / candidate).
//
// Convention: a route's `loading.tsx` and the `FeatureBoundary` `fallback`
// prop MUST render the SAME feature-coupled `<*Skeleton/>` component. When
// they diverge, navigating to the route shows two visually different
// skeletons in sequence (Next route Suspense fallback → page mount →
// FeatureBoundary Suspense fallback), which users perceive as a flicker.
//
// These stories use a plain skeleton block as a stand-in for a route
// skeleton — the rule applies to any consumer of FeatureBoundary.

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, Skeleton } from "../../ui";
import { FeatureBoundary } from "./feature-boundary";

const meta = {
  title: "Feedback/FeatureBoundary",
  component: FeatureBoundary,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Composes react-error-boundary + Suspense. The fallback is shown " +
          "during data-fetch suspends; errors below are caught locally and " +
          "render a recoverable UI. Per the route-loading convention, the " +
          "fallback should be the SAME `<*Skeleton/>` used by the route's " +
          "`loading.tsx` to keep navigation transitions seamless.",
      },
    },
  },
} satisfies Meta<typeof FeatureBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

function RouteSkeletonFallback() {
  return (
    <div
      data-testid="route-skeleton-fallback"
      className="flex w-[420px] flex-col gap-3"
      aria-busy="true"
    >
      <Skeleton className="h-6 w-32" />
      <Card className="overflow-hidden py-0">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

let resolvedOnce = false;
function neverSuspend(): Promise<void> {
  if (resolvedOnce) return Promise.resolve();
  resolvedOnce = true;
  return new Promise((resolve) => setTimeout(resolve, 1_500));
}

function LazyContent({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void neverSuspend().then(() => setReady(true));
  }, []);
  if (!ready) {
    throw neverSuspend();
  }
  return <>{children}</>;
}

export const LoadingFallback: Story = {
  args: {
    fallback: <RouteSkeletonFallback />,
    children: (
      <Suspense fallback={<RouteSkeletonFallback />}>
        <LazyContent>
          <div className="w-[420px] rounded-md border p-4 text-sm">
            Loaded feature content
          </div>
        </LazyContent>
      </Suspense>
    ),
  },
};

function ThrowingChild(): ReactNode {
  throw new Error("Simulated feature crash");
}

export const ErrorState: Story = {
  args: {
    fallback: <RouteSkeletonFallback />,
    recoveryActions: [{ label: "Voltar para o início", href: "/" }],
    children: <ThrowingChild />,
  },
};
