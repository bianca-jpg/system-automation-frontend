import { apiFetch } from "@/lib/api/http-client";
import type { Parameter } from "@/entities/parametro/model/types";
import { parseNumberedPage, type NumberedPage } from "@/shared/types/numbered-page";

// Leitura da lista de parâmetros. Vive em `entities/parametro` (e não em
// `features/parametros`) porque o dado é o `Parameter` que já mora aqui e o
// consumidor é o `AppDataProvider` de `features/pedidos` — feature não importa
// de feature irmã; as duas puxam da camada de baixo.

// Espelha ParametroOut do backend (app/modules/parametros/schemas.py).
interface ParametroOut {
  id: number;
  chave: string;
  valor: string;
  tipo: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

function toParameter(p: ParametroOut): Parameter {
  return {
    id: p.id,
    name: p.chave,
    type: p.tipo,
    value: p.valor,
    unit: "",
    limits: "",
    limitsDetail: "",
    description: p.descricao ?? "",
    status: "Ativo",
  };
}

export type ParametersSort = "id" | "name" | "type" | "value" | "updatedAt";

export async function fetchParametros(params: {
  page: number;
  pageSize?: number;
  search?: string;
  sort?: ParametersSort;
  order?: "asc" | "desc";
  signal?: AbortSignal;
}): Promise<NumberedPage<Parameter>> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 25),
    search: (params.search ?? "").slice(0, 120),
    sort: params.sort ?? "name",
    order: params.order ?? "asc",
  });
  const data = await apiFetch<unknown>(`/api/v1/parametros?${query.toString()}`, {
    signal: params.signal,
  });
  const page = parseNumberedPage<ParametroOut>(data, "parâmetros");
  return { ...page, rows: page.rows.map(toParameter) };
}
