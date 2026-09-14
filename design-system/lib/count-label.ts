interface FormatCountLabelConfig {
  noun: [singular: string, plural: string];
  qualifier?: [singular: string, plural: string];
  feminine?: boolean;
  zeroPrefix?: string;
}

/**
 * Create a function to format count labels with proper pluralization and gender agreement
 */
export const createCountLabel = (config: FormatCountLabelConfig) => {
  const { noun, qualifier, feminine = true, zeroPrefix = "Nenhum" } = config;

  return (count: number, withQualifier = false): string => {
    const p = <T>(s: T, pl: T) => (count > 1 ? pl : s);
    const nenhuma = feminine ? `${zeroPrefix}a` : zeroPrefix;
    const qualifierText =
      withQualifier && qualifier ? ` ${p(...qualifier)}` : "";

    if (count === 0) {
      return `${nenhuma} ${noun[0]}${qualifierText} encontrad${feminine ? "a" : "o"}`;
    }

    const isPlural = count > 1;
    const pluralPrefix = feminine ? "Todas as" : "Todos os";
    const quantityText = isPlural
      ? `${pluralPrefix} ${count} ${noun[1]}`
      : `1 ${noun[0]}`;
    const verb = p("foi", "foram");
    const loaded = `carregad${feminine ? "a" : "o"}${p("", "s")}`;

    return `${quantityText}${qualifierText} ${verb} ${loaded}`;
  };
};
