"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useFormField } from "./Form";

function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      id={formDescriptionId}
      data-slot="form-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { FormDescription };
