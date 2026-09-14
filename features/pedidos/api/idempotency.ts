const IDEMPOTENCY_FIRST_CHARACTER = /^[A-Za-z0-9]$/;
const IDEMPOTENCY_CHARACTER = /^[A-Za-z0-9._:-]$/;

/** Mensagem única para os POSTs idempotentes desta feature. */
export const INVALID_IDEMPOTENCY_KEY_MESSAGE =
  'A chave de idempotência deve conter de 8 a 128 caracteres ASCII seguros.';

export function validIdempotencyKey(value: string): boolean {
  return value.length >= 8
    && value.length <= 128
    && IDEMPOTENCY_FIRST_CHARACTER.test(value[0] ?? '')
    && Array.from(value).every(character => IDEMPOTENCY_CHARACTER.test(character));
}
