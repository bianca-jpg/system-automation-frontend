/**
 * Entrada numérica em pt-BR — vírgula decimal, ponto de milhar.
 *
 * O design system cobre `cpf`, `cnpj`, `phone`, `document` e `currency`
 * (`Mask.format`), mas não expõe uma máscara de número "solto": a de moeda
 * força duas casas e o prefixo R$. O campo "Valor" de um parâmetro pode ser
 * percentual, quantidade ou fator, então precisa de casas livres e sem prefixo.
 *
 * A convenção de separadores segue a mesma do `formatCurrencyInput` do DS, para
 * o usuário não ver dois comportamentos de digitação diferentes no mesmo app.
 *
 * REGRA IMPORTANTE: o que a API recebe é sempre ponto decimal. A vírgula existe
 * só na exibição — `paraEnvio` faz a conversão de volta antes do submit.
 */

/** Agrupa o milhar com ponto: "1234567" → "1.234.567". */
function agruparMilhar(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata o que o usuário digita, preservando a vírgula em digitação.
 *
 * `casasDecimais` limita as casas depois da vírgula. `undefined` = livre.
 * `inteiro: true` descarta a parte decimal (campos de contagem).
 */
export function mascararNumeroBr(
  valor: string,
  opcoes: { casasDecimais?: number; inteiro?: boolean } = {},
): string {
  const { casasDecimais, inteiro = false } = opcoes;

  // Aceita o que vier: dígitos, vírgula e ponto. Sinal negativo é preservado
  // só na frente — parâmetro pode ter limite negativo.
  const negativo = valor.trim().startsWith("-");
  const limpo = valor.replace(/[^\d.,]/g, "");

  if (!limpo) return negativo ? "-" : "";

  if (inteiro) {
    const digitos = limpo.replace(/[.,]/g, "");
    return (negativo ? "-" : "") + agruparMilhar(digitos);
  }

  // O ÚLTIMO separador é o decimal — assim "1.234,5" e "1234.5" viram a mesma
  // coisa, e quem cola valor formatado de outro lugar não perde a casa.
  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");
  const separador = Math.max(ultimaVirgula, ultimoPonto);
  const terminaEmSeparador = /[.,]$/.test(limpo);

  if (separador < 0) {
    return (negativo ? "-" : "") + agruparMilhar(limpo.replace(/[.,]/g, ""));
  }

  const inteiroDigitos = limpo.slice(0, separador).replace(/[.,]/g, "");
  let decimaisDigitos = limpo.slice(separador + 1).replace(/[.,]/g, "");

  if (casasDecimais !== undefined) {
    decimaisDigitos = decimaisDigitos.slice(0, casasDecimais);
  }

  // Mantém a vírgula solta enquanto o usuário ainda está digitando as casas.
  if (terminaEmSeparador && decimaisDigitos === "") {
    return (negativo ? "-" : "") + agruparMilhar(inteiroDigitos) + ",";
  }

  return (
    (negativo ? "-" : "") + agruparMilhar(inteiroDigitos) + "," + decimaisDigitos
  );
}

/**
 * Converte o texto exibido para o formato que a API espera: ponto decimal, sem
 * separador de milhar. Devolve string vazia quando não há número.
 *
 * Chame SEMPRE antes de enviar — mandar "1.234,5" para o backend é enviar algo
 * que ele não sabe ler.
 */
export function paraEnvio(valorExibido: string): string {
  const negativo = valorExibido.trim().startsWith("-");
  const limpo = valorExibido.replace(/[^\d.,]/g, "");

  if (!limpo) return "";

  // Aqui, DIFERENTE de `mascararNumeroBr`, só a vírgula é decimal e o ponto é
  // sempre milhar. Esta função consome o texto que a máscara produziu, e a
  // máscara sempre emite vírgula para a casa decimal. Tratar o ponto como
  // decimal aqui faria "1.234" (mil duzentos e trinta e quatro) virar 1.234 —
  // um erro de três ordens de grandeza indo para a API, sem nada na tela.
  const separador = limpo.lastIndexOf(",");

  if (separador < 0) {
    return (negativo ? "-" : "") + limpo.replace(/\./g, "");
  }

  const parteInteira = limpo.slice(0, separador).replace(/[.,]/g, "");
  const parteDecimal = limpo.slice(separador + 1).replace(/[.,]/g, "");

  if (!parteDecimal) return (negativo ? "-" : "") + parteInteira;

  return (negativo ? "-" : "") + `${parteInteira}.${parteDecimal}`;
}

/**
 * Traz um valor da API (ponto decimal) para a exibição em pt-BR. Usado ao abrir
 * um formulário de edição com dado que já existe.
 */
export function paraExibicao(
  valorDaApi: string | number | null | undefined,
  opcoes: { casasDecimais?: number; inteiro?: boolean } = {},
): string {
  if (valorDaApi === null || valorDaApi === undefined) return "";
  return mascararNumeroBr(String(valorDaApi).replace(".", ","), opcoes);
}
