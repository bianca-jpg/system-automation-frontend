import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../../lib/utils";

export type PageShellProps = ComponentPropsWithoutRef<"div">;

export function PageShell({ className, ...props }: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      data-page-shell=""
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-[var(--layout-shell-max-width)] flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
