// Orçamento de tamanho dos chunks do build do Storybook.
//
// O Vite avisa "Some chunks are larger than 500 kB" sem distinguir o que é
// nosso do que é ferramenta. Este gate faz essa separação e transforma o aviso
// genérico num número por chunk:
//
//   - chunks do PRÓPRIO Storybook (runtime do preview, motor do addon-a11y)
//     nunca chegam ao usuário; ficam num orçamento próprio, mais folgado, só
//     para detectar salto anormal ao subir versão;
//   - todo o resto — nossos componentes e as libs que eles arrastam — fica no
//     orçamento apertado. É aí que uma regressão de code-split aparece (foi
//     exatamente o caso do `emoji-picker-react`, que só era "lazy" no papel
//     enquanto o import estático dos enums o prendia ao bundle principal).
//
// Uso: `node scripts/chunk-budget.mjs [diretório]` (padrão `storybook-static`).
// Falha com código 1 e lista o que estourou.
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const KB = 1024;

/** Orçamento dos chunks dos nossos componentes. */
export const COMPONENT_BUDGET_KB = 560;

/** Orçamento dos chunks que são infraestrutura do Storybook. */
export const TOOLING_BUDGET_KB = 1_500;

/**
 * Chunks que são ferramenta de desenvolvimento, não produto. Casados pelo
 * prefixo do nome do arquivo, antes do hash que o Vite acrescenta.
 */
export const TOOLING_CHUNK_PREFIXES = [
  // Runtime do preview do Storybook (o `iframe.html` inteiro).
  "iframe-",
  // Motor do addon-a11y; só roda na auditoria.
  "axe-",
];

const isToolingChunk = (fileName) =>
  TOOLING_CHUNK_PREFIXES.some((prefix) => fileName.startsWith(prefix));

export function classify(fileName, sizeBytes) {
  const tooling = isToolingChunk(fileName);
  const budgetKb = tooling ? TOOLING_BUDGET_KB : COMPONENT_BUDGET_KB;
  const sizeKb = sizeBytes / KB;
  return {
    fileName,
    sizeKb,
    budgetKb,
    kind: tooling ? "tooling" : "component",
    overBudget: sizeKb > budgetKb,
  };
}

export async function collectChunks(assetsDir) {
  const entries = await readdir(assetsDir, { withFileTypes: true });
  const chunks = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const { size } = await stat(join(assetsDir, entry.name));
    chunks.push(classify(entry.name, size));
  }
  return chunks.sort((a, b) => b.sizeKb - a.sizeKb);
}

export function formatReport(chunks) {
  const offenders = chunks.filter((chunk) => chunk.overBudget);
  const lines = [];
  if (offenders.length === 0) {
    const largest = chunks[0];
    lines.push(
      `Orçamento de chunks OK — ${chunks.length} chunks, maior: ${largest ? `${basename(largest.fileName)} (${largest.sizeKb.toFixed(1)} kB)` : "nenhum"}.`,
    );
    return { ok: true, text: lines.join("\n") };
  }
  lines.push(`Orçamento de chunks ESTOURADO em ${offenders.length} chunk(s):`);
  for (const chunk of offenders) {
    lines.push(
      `  - ${chunk.fileName}: ${chunk.sizeKb.toFixed(1)} kB > ${chunk.budgetKb} kB (${chunk.kind})`,
    );
  }
  lines.push(
    "",
    "Um chunk de componente acima do orçamento normalmente significa que uma",
    "dependência pesada deixou de ser code-split. Confira se o módulo não está",
    "sendo importado estática e dinamicamente ao mesmo tempo (o Vite reporta",
    "isso como INEFFECTIVE_DYNAMIC_IMPORT).",
  );
  return { ok: false, text: lines.join("\n") };
}

export async function runChunkBudget(outDir) {
  const assetsDir = resolve(outDir, "assets");
  if (!existsSync(assetsDir)) {
    throw new Error(
      `Diretório de assets não encontrado: ${assetsDir}. Rode \`pnpm build-storybook\` antes.`,
    );
  }
  const chunks = await collectChunks(assetsDir);
  return formatReport(chunks);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]).endsWith("chunk-budget.mjs");

if (invokedDirectly) {
  const outDir = resolve(process.argv[2] ?? "storybook-static");
  try {
    const { ok, text } = await runChunkBudget(outDir);
    process.stdout.write(`${text}\n`);
    process.exit(ok ? 0 : 1);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}
