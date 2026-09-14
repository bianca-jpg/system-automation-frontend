import * as React from "react";

import { cn } from "../../../lib/utils";
import { skeletonVariants } from "./variants";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants(), className)}
      {...props}
    />
  );
}

export { Skeleton };
