import { ProductItem } from '@/shared/types/models';

interface GroupedItem extends ProductItem {
  sizesList: string[];
}

// Classificação de categoria por palavra-chave no nome do produto. Usada tanto
// pela tabela de itens originais quanto pela de itens atuais.
export function classifyItemCategory(name: string): string {
  const nameUpper = name.toUpperCase();
  if (nameUpper.includes('CAMISETA') || nameUpper.includes('T-SHIRT') || nameUpper.includes('TSHIRT') || nameUpper.includes('T SHIRT') || nameUpper.includes('REGATA')) return 'Camisetas';
  if (nameUpper.includes('POLO')) return 'Polos';
  if (nameUpper.includes('BONE') || nameUpper.includes('BONÉ') || nameUpper.includes('CHAPEU') || nameUpper.includes('CHAPÉU')) return 'Bonés e Chapéus';
  if (nameUpper.includes('CINTO')) return 'Cintos';
  if (nameUpper.includes('MEIA')) return 'Meias';
  if (nameUpper.includes('CALCA') || nameUpper.includes('CALÇA')) return 'Calças';
  if (nameUpper.includes('BERMUDA') || nameUpper.includes('SHORTS')) return 'Bermudas e Shorts';
  if (nameUpper.includes('JAQUETA') || nameUpper.includes('CASACO') || nameUpper.includes('PARKA') || nameUpper.includes('COLETE')) return 'Casacos e Jaquetas';
  if (nameUpper.includes('CUECA') || nameUpper.includes('SUNGA') || nameUpper.includes('PIJAMA')) return 'Intimates e Moda Praia';
  if (nameUpper.includes('MOCHILA')) return 'Mochilas';
  if (nameUpper.includes('MALA')) return 'Malas';
  if (nameUpper.includes('ACESSORIO') || nameUpper.includes('ACESSÓRIO') || nameUpper.includes('CARTEIRA') || nameUpper.includes('NECESSAIRE') || nameUpper.includes('PULSEIRA') || nameUpper.includes('COLAR') || nameUpper.includes('CHAVEIRO')) return 'Acessórios';
  if (nameUpper.includes('BLAZER') || nameUpper.includes('COSTUME') || nameUpper.includes('TERNO') || nameUpper.includes('GRAVATA') || nameUpper.includes('PALETO') || nameUpper.includes('PALETÓ')) return 'Alfaiataria';
  if (nameUpper.includes('SAPATO') || nameUpper.includes('TENIS') || nameUpper.includes('TÊNIS') || nameUpper.includes('MOCASSIM') || nameUpper.includes('BOTA') || nameUpper.includes('CHINELO') || nameUpper.includes('SANDALIA') || nameUpper.includes('SANDÁLIA')) return 'Calçados';
  if (nameUpper.includes('CAMISA')) return 'Camisas';
  if (nameUpper.includes('TRICOT') || nameUpper.includes('SUETER') || nameUpper.includes('SUÉTER') || nameUpper.includes('CARDIGAN') || nameUpper.includes('MOLETOM')) return 'Tricots e Moletons';
  if (nameUpper.includes('PERFUME') || nameUpper.includes('FRAGRANCIA') || nameUpper.includes('FRAGRÂNCIA') || nameUpper.includes('DESODORANTE') || nameUpper.includes('SHAMPOO')) return 'Perfumes e Cosméticos';
  if (nameUpper.includes('OCULOS') || nameUpper.includes('ÓCULOS')) return 'Óculos';
  return 'Outros';
}

export function formatToBRLDate(dateStr?: string): string {
  if (!dateStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  return dateStr;
}

// Agrupa itens por código, consolidando as linhas de grade por tamanho
// ("Produto (Tam: M)", "Produto (Tam: G)"...) em uma única linha com
// sizesList (ex.: ["M: 3", "G: 5"]).
export function groupItems(items: ProductItem[]): GroupedItem[] {
  const map = new Map<string, GroupedItem>();
  items.forEach(item => {
    let baseName = item.name;
    let sizeValue = "UN";

    const sizeMatch = item.name.match(/\(Tam:\s*([^)]+)\)$/i);
    if (sizeMatch) {
      sizeValue = sizeMatch[1].trim();
      baseName = item.name.replace(/\s*\(Tam:\s*[^)]+\)\s*$/i, '').trim();
    }

    if (!map.has(item.code)) {
      map.set(item.code, { ...item, name: baseName, qty: 0, sizesList: [] });
    }
    const existing = map.get(item.code)!;
    existing.qty += item.qty;
    existing.sizesList.push(`${sizeValue}: ${item.qty}`);
  });
  return Array.from(map.values());
}

// Agrupa itens (já processados por groupItems) por categoria de produto,
// preservando a ordem de primeira ocorrência de cada categoria.
export function groupByCategory(items: GroupedItem[]): Record<string, GroupedItem[]> {
  return items.reduce((acc, item) => {
    const cat = classifyItemCategory(item.name);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroupedItem[]>);
}

export function sumItemsValue(items: ProductItem[]): number {
  return items.reduce((acc, item) => acc + (item.qty * item.unitValue), 0);
}
