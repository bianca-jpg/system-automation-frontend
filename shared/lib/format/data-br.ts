/**
 * Chave de ordenação para uma data que chega à UI JÁ formatada em pt-BR
 * ("dd/mm/aaaa" ou "dd/mm/aaaa, hh:mm").
 *
 * Ordenar o texto exibido ordenaria pelo DIA do mês — "31/01/2026" viria depois
 * de "01/12/2026". Este helper devolve uma chave lexicograficamente comparável
 * (aaaammddhhmm) para usar no `sortAccessor` das colunas de data do
 * `DynamicTable`.
 *
 * Existe porque a data já vem formatada nas linhas de apresentação
 * (`ParametroRequestRow.date`, `ParameterHistoryItem.date`), sem o ISO original
 * ao lado. Quando a linha carregar o valor cru, ordene por ele e descarte isto.
 *
 * Texto não reconhecido (ex.: o travessão de "sem data") vira string vazia, que
 * ordena antes de qualquer data real na ordem crescente.
 */
const DATA_BR = /^(\d{2})\/(\d{2})\/(\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2}))?/;

export function chaveOrdenacaoDataBr(valor: string): string {
  const partes = DATA_BR.exec(valor.trim());
  if (!partes) return "";

  const [, dia, mes, anoBruto, hora = "0", minuto = "00"] = partes;
  // Ano de 2 dígitos (formato curto de alguns locales) vira 20xx: sem isso a
  // chave teria comprimentos diferentes e a comparação sairia errada.
  const ano = anoBruto!.length === 2 ? `20${anoBruto}` : anoBruto!;

  return `${ano}${mes}${dia}${hora!.padStart(2, "0")}${minuto}`;
}
