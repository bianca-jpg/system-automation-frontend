/**
 * Regra de coleção: a coleção muda a cada 6 meses (semestre civil).
 * - Jan–Jun de um ano    → 1º semestre (semestre 0)
 * - Jul–Dez do mesmo ano → 2º semestre (semestre 1)
 *
 * Âncora: 1º semestre de 2026 = coleção 117. Cada semestre seguinte soma +1.
 * Ex.: Jul–Dez/2026 = 118, Jan–Jun/2027 = 119, Jul–Dez/2027 = 120, ...
 *
 * A próxima coleção é sempre a vigente + 1.
 */

const COLECAO_ANCORA = 117;
const ANO_ANCORA = 2026;

/** Coleção vigente para a data informada (padrão: agora). */
export function getColecaoVigente(date: Date = new Date()): number {
  const semestre = date.getMonth() < 6 ? 0 : 1; // getMonth(): 0=Jan … 11=Dez
  return COLECAO_ANCORA + (date.getFullYear() - ANO_ANCORA) * 2 + semestre;
}

// Meses (calendário comercial, não o semestre civil acima) em que a simulação
// de adequação (readequação +5%) fica ativa.
const ADEQUACAO_ACTIVE_MONTHS = [3, 4, 9, 10];

/** `selectedMonthSimulated` cai num dos meses em que a simulação de adequação fica ativa. */
export function isAdequacaoActiveMonth(selectedMonthSimulated: number): boolean {
  return ADEQUACAO_ACTIVE_MONTHS.includes(selectedMonthSimulated);
}
