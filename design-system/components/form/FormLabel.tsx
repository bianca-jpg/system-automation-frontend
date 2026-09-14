"use client";

import * as React from "react";

import { Label } from "../ui/label";
import { cn } from "../../lib/utils";
import { useFormField } from "./Form";

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive-text", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

export { FormLabel };
