"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Input } from "../input";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  /** Controlled visibility (optional). If not provided, internal state is used. */
  showPassword?: boolean;
  /** Callback when visibility toggle is clicked (optional). */
  onShowPasswordChange?: (show: boolean) => void;
  /** Tab order for the visibility toggle button. Defaults to the natural tab order. */
  toggleTabIndex?: number;
}

function PasswordInput({
  className,
  showPassword: controlledShow,
  onShowPasswordChange,
  toggleTabIndex = 0,
  ...props
}: PasswordInputProps) {
  const [internalShow, setInternalShow] = React.useState(false);
  const isControlled = controlledShow !== undefined;
  const showPassword = isControlled ? controlledShow : internalShow;

  const toggle = () => {
    const next = !showPassword;
    if (!isControlled) setInternalShow(next);
    onShowPasswordChange?.(next);
  };

  return (
    <div className="relative" data-slot="password-input">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        autoComplete={props.autoComplete ?? "off"}
        {...props}
      />
      <button
        type="button"
        onClick={toggle}
        onMouseDown={(event) => event.preventDefault()}
        tabIndex={toggleTabIndex}
        disabled={props.disabled}
        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={showPassword}
        data-slot="password-input-toggle"
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ds-focus-ring  "
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5" aria-hidden />
        ) : (
          <Eye className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
