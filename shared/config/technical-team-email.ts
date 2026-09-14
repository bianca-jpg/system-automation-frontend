import type { RecipientOption } from '@/shared/config/commercial-emails';

// Destinatário fixo do botão "COMUNICAR TIME TÉCNICO" no modal de comunicação.
// Diferente de commercial-emails.ts, não é uma lista editável — é sempre este
// único endereço, o canal oficial do time técnico para falhas/incidentes da
// aplicação.
export const technicalTeamEmail: RecipientOption = {
  label: 'Time Técnico',
  email: 'tech-team@example.com',
};
