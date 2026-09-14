import * as React from "react";

import { cn } from "../../../lib/utils";
import { ActionButton } from "../action-button";

type LoadMoreButtonProps = Omit<
  React.ComponentProps<typeof ActionButton>,
  "children" | "variant" | "size"
> & {
  children?: React.ReactNode;
};

function LoadMoreButton({
  children = "Carregar mais",
  className,
  type = "button",
  ...props
}: LoadMoreButtonProps) {
  return (
    <ActionButton
      data-slot="load-more-button"
      type={type}
      variant="secondary"
      size="sm"
      className={cn(
        "w-full justify-center sm:w-auto sm:min-w-[10rem]",
        className,
      )}
      {...props}
    >
      {children}
    </ActionButton>
  );
}

export { LoadMoreButton };
