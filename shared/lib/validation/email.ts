/**
 * Validação leve de e-mail para formulários (o servidor continua sendo a fonte da verdade).
 */
export function isValidEmail(email: string): boolean {
  const s = email.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
