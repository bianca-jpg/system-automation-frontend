/**
 * Iniciais de um nome, para o avatar — mesmo comportamento do Teams com quem
 * não tem foto cadastrada.
 *
 * Regra: primeira letra do primeiro nome + primeira letra do ÚLTIMO nome, que
 * é como a pessoa é identificada ("Maria Aparecida de Souza" → "MS", não "MA").
 * Preposições ficam de fora justamente por isso: pegar as duas primeiras
 * palavras daria "MA" e, em "Ana de Lima", daria "AD" — inicial de preposição
 * não identifica ninguém.
 */

// Partículas que não são nome. Comparadas em minúsculas.
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "del", "di", "van", "von"]);

export function iniciaisDoNome(nome: string | null | undefined): string {
  if (!nome) return "";

  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0 && !PARTICULAS.has(parte.toLowerCase()));

  if (partes.length === 0) return "";

  const primeira = partes[0]!;
  const ultima = partes[partes.length - 1]!;

  // Nome único ("Madonna", ou um e-mail que sobrou do fallback) rende uma só
  // letra: inventar a segunda a partir do meio da palavra confundiria mais do
  // que ajudaria.
  const letras = partes.length === 1 ? primeira[0]! : `${primeira[0]!}${ultima[0]!}`;

  // `toLocaleUpperCase` em pt-BR: preserva acento em nome que começa com
  // vogal acentuada ("Ângela" → "Â"), que o avatar exibe sem problema.
  return letras.toLocaleUpperCase("pt-BR");
}
