"use client";

import * as React from "react";

import { cn } from "../../../lib/utils";
import { Typography } from "../../data-display/typography";
import { ActionButton } from "../../ui/action-button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../ui/input-otp";

const OTP_SLOT_CLASS =
  "h-11 w-9 rounded-[var(--radius-control)] border ds-border-control text-base font-medium sm:w-10";

export function formatCodeCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export interface ConfirmCodeScreenProps
  extends Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit" | "title"> {
  value: string;
  onValueChange: (value: string) => void;
  onVerify: () => void | Promise<void>;
  onResend: () => void | Promise<void>;
  email?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  helpText?: React.ReactNode;
  codeLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  verifying?: boolean;
  resending?: boolean;
  resendCooldownSeconds?: number;
  error?: React.ReactNode;
  footer?: React.ReactNode;
}

function ConfirmCodeScreen({
  value,
  onValueChange,
  onVerify,
  onResend,
  email,
  title = "Confira seu e-mail",
  description = "Digite o código de verificação enviado para você.",
  helpText = "Não recebeu? Confira a pasta de spam antes de reenviar.",
  codeLength = 6,
  autoFocus = true,
  disabled = false,
  verifying = false,
  resending = false,
  resendCooldownSeconds = 0,
  error,
  footer,
  className,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ConfirmCodeScreenProps) {
  const safeCodeLength = Math.min(8, Math.max(4, Math.floor(codeLength)));
  const errorId = React.useId();
  const generatedTitleId = React.useId();
  const titleId = ariaLabelledBy ?? generatedTitleId;
  const cooldown = Math.max(0, Math.floor(resendCooldownSeconds));
  const canVerify =
    !disabled && !verifying && !resending && value.length === safeCodeLength;
  const canResend = !disabled && !verifying && !resending && cooldown === 0;
  const previousCanResendRef = React.useRef(canResend);
  const [resendAnnouncement, setResendAnnouncement] = React.useState("");

  React.useEffect(() => {
    const wasAvailable = previousCanResendRef.current;

    if (!wasAvailable && canResend) {
      setResendAnnouncement("O código pode ser reenviado");
    } else if (!canResend) {
      setResendAnnouncement("");
    }

    previousCanResendRef.current = canResend;
  }, [canResend]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canVerify) void onVerify();
  };

  const handleResend = () => {
    if (!canResend) return;
    void onResend();
  };

  return (
    <form
      {...props}
      data-slot="confirm-code-screen"
      aria-labelledby={titleId}
      aria-busy={verifying || resending || undefined}
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-6",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <div className="text-center">
        <Typography
          id={ariaLabelledBy ? undefined : generatedTitleId}
          as="h1"
          variant="h4"
          className="pb-1"
        >
          {title}
        </Typography>
        <Typography as="p" color="soft" variant="small">
          {description}
        </Typography>
        {email ? (
          <Typography
            as="strong"
            variant="small"
            className="mt-1 block break-all text-foreground"
          >
            {email}
          </Typography>
        ) : null}
        {helpText ? (
          <Typography
            as="p"
            color="soft"
            variant="small"
            className="mt-2"
          >
            {helpText}
          </Typography>
        ) : null}
      </div>

      <InputOTP
        maxLength={safeCodeLength}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled || verifying}
        aria-label="Código de verificação"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        containerClassName="w-full justify-center"
        onChange={(nextValue) =>
          onValueChange(nextValue.slice(0, safeCodeLength))
        }
      >
        <InputOTPGroup className="justify-center gap-2">
          {Array.from({ length: safeCodeLength }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className={OTP_SLOT_CLASS}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {error ? (
        <Typography
          id={errorId}
          as="p"
          variant="small"
          role="alert"
          className="text-center text-destructive-text"
        >
          {error}
        </Typography>
      ) : null}

      <div className="flex w-full flex-col gap-3">
        <ActionButton
          type="submit"
          disabled={!canVerify}
          loading={verifying}
          className="w-full"
        >
          Verificar código
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={!canResend}
          loading={resending}
          className="w-full"
          onClick={handleResend}
        >
          {cooldown > 0
            ? `Reenviar em ${formatCodeCountdown(cooldown)}`
            : "Reenviar código"}
        </ActionButton>
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {resendAnnouncement}
        </span>
        {footer}
      </div>
    </form>
  );
}

export { ConfirmCodeScreen };
