import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import {
  ConfirmCodeScreen,
  formatCodeCountdown,
} from "../confirm-code-screen";

describe("ConfirmCodeScreen", () => {
  test("formats resend countdowns", () => {
    expect(formatCodeCountdown(87)).toBe("1:27");
    expect(formatCodeCountdown(-4)).toBe("0:00");
  });

  test("keeps verification controlled and submits a complete code", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onVerify = vi.fn();

    const { rerender } = render(
      <ConfirmCodeScreen
        value=""
        autoFocus={false}
        onValueChange={onValueChange}
        onVerify={onVerify}
        onResend={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Verificar código" }),
    ).toBeDisabled();

    rerender(
      <ConfirmCodeScreen
        value="123456"
        autoFocus={false}
        onValueChange={onValueChange}
        onVerify={onVerify}
        onResend={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Verificar código" }));
    expect(onVerify).toHaveBeenCalledOnce();
  });

  test("announces errors without announcing every countdown tick", () => {
    const props = {
      value: "123456",
      autoFocus: false,
      onValueChange: () => undefined,
      onVerify: () => undefined,
      onResend: () => undefined,
      error: "Código expirado",
    };
    const { rerender } = render(
      <ConfirmCodeScreen
        {...props}
        resendCooldownSeconds={61}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Código expirado");
    expect(screen.getByRole("alert")).toHaveClass("text-destructive-text");
    expect(screen.getByRole("alert")).not.toHaveClass("text-destructive");
    expect(screen.getByRole("button", { name: "Reenviar em 1:01" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(
      <ConfirmCodeScreen {...props} resendCooldownSeconds={60} />,
    );

    expect(screen.getByRole("button", { name: "Reenviar em 1:00" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(
      <ConfirmCodeScreen {...props} disabled resendCooldownSeconds={0} />,
    );

    expect(screen.getByRole("button", { name: "Reenviar código" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(<ConfirmCodeScreen {...props} resendCooldownSeconds={0} />);

    expect(screen.getByRole("button", { name: "Reenviar código" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "O código pode ser reenviado",
    );

    rerender(
      <ConfirmCodeScreen {...props} resendCooldownSeconds={30} />,
    );

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
