/**
 * Máscaras reutilizáveis para inputs (telefone, CPF, CNPJ, documento).
 * Uso em formulários: aplique Mask.format(maskType, value) no onChange do input.
 * Para enviar apenas dígitos à API: use getPureNumbers(value).
 */
const process = (mask: string, value: string) => {
  const arrayMask = mask.split("");
  const arrayValue = String(value).split("");
  return arrayMask.reduce((acc, curr) => {
    if (arrayValue.length) {
      if (curr === "9") {
        return acc + arrayValue.shift();
      }
      return acc + curr;
    }
    return acc;
  }, "");
};

export const getPureNumbers = (value: string) => {
  if (!value) return "";
  return value.replace(/\D+/g, "");
};

const formatThousands = (digits: string, fallbackZero = false) => {
  const normalizedDigits = digits.replace(/^0+(?=\d)/, "");
  if (!normalizedDigits) {
    return fallbackZero ? "0" : "";
  }

  return normalizedDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatCurrencyInput = (value: string) => {
  const sanitized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d.,]/g, "");

  if (!sanitized) {
    return "";
  }

  const endsWithSeparator = /[.,]$/.test(sanitized);
  const lastCommaIndex = sanitized.lastIndexOf(",");
  const lastDotIndex = sanitized.lastIndexOf(".");
  const lastSeparatorIndex = Math.max(lastCommaIndex, lastDotIndex);

  if (lastSeparatorIndex < 0) {
    return formatThousands(sanitized.replace(/[.,]/g, ""));
  }

  const integerDigits = sanitized
    .slice(0, lastSeparatorIndex)
    .replace(/[.,]/g, "");
  const decimalDigits = sanitized
    .slice(lastSeparatorIndex + 1)
    .replace(/[.,]/g, "");

  if (endsWithSeparator) {
    return `${formatThousands(integerDigits, true)},`;
  }

  if (decimalDigits.length <= 2) {
    return `${formatThousands(integerDigits, true)},${decimalDigits}`;
  }

  return formatThousands(sanitized.replace(/[.,]/g, ""));
};

const masks = {
  phone: (value: string) => {
    const pure = getPureNumbers(value);

    if (pure.length < 11) {
      return process("(99) 9999-9999", pure);
    }

    return process("(99) 99999-9999", pure);
  },

  cpf: (value: string) => {
    const pure = getPureNumbers(value);
    return process("999.999.999-99", pure);
  },

  cnpj: (value: string) => {
    const pure = getPureNumbers(value);
    return process("99.999.999/9999-99", pure);
  },

  document: (value: string) => {
    const pure = getPureNumbers(value);

    if (pure.length <= 11) {
      return masks.cpf(value);
    }
    return masks.cnpj(value);
  },

  currency: (value: string) => formatCurrencyInput(value),
};

type MaskType = keyof typeof masks;

class StaticClass {
  constructor() {
    throw new Error("This is a static class");
  }
}

export class Mask extends StaticClass {
  static format(maskType: MaskType, value: string) {
    const mask = masks[maskType];
    return mask ? mask(value) : value;
  }
}
