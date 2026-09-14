// Lista de destinatários pré-definidos do botão "COMUNICAR TIME COMERCIAL".
// Edite à vontade: cada item vira uma opção no select do modal de comunicação.
// O usuário também pode escolher "Outro (digitar e-mail)" e informar um endereço manual.

export interface RecipientOption {
  label: string;
  email: string;
}

export const commercialEmails: RecipientOption[] = [
  // Conforme o time comercial confirmar os endereços reais, adicione aqui.
  { label: 'Bianca (teste)', email: 'dev@example.com' },
  { label: 'Victoria Mollica', email: 'dev-comercial@example.com' },
];
