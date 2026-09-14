"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useFormField } from "./Form";

function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;
  if (!body) return null;
  return (
    <p
      id={formMessageId}
      data-slot="form-message"
      role="alert"
      className={cn("text-sm font-medium text-destructive-text", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export { FormMessage };
