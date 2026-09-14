import { automation_PANEL_ACCESS_DENIED_MESSAGE } from "@/shared/config/auth/automation-panel-roles";

export const loginCopy = {
  sessionExpired: "Sua sessão expirou. Entre novamente para continuar.",
  automationPanelOnly: automation_PANEL_ACCESS_DENIED_MESSAGE,
  ssoGenericError: "Não foi possível entrar com a conta Microsoft. Tente novamente.",
} as const;
