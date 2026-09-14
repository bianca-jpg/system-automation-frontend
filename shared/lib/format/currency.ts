/** Moeda BRL (pt-BR): R$ 1.234,50. Formatação pura, sem regra de domínio. */
export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};
