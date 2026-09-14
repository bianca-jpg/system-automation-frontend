import { apiFetch } from "@/lib/api/http-client";
import type { ParameterChangeRequest } from "@/entities/parametro/model/types";
import { parseNumberedPage, type NumberedPage } from "@/shared/types/numbered-page";

type ChangeRequestsStatus = "pending" | "approved" | "rejected" | "resolved";
type ChangeRequestsSort = "id" | "createdAt" | "updatedAt" | "parameter" | "status";

export async function fetchChangeRequests(params: {
  page: number;
  pageSize?: number;
  search?: string;
  statusFilter?: ChangeRequestsStatus;
  sort?: ChangeRequestsSort;
  order?: "asc" | "desc";
  signal?: AbortSignal;
}): Promise<NumberedPage<ParameterChangeRequest>> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 25),
    search: (params.search ?? "").slice(0, 120),
    sort: params.sort ?? "id",
    order: params.order ?? "desc",
  });
  if (params.statusFilter) query.set("statusFilter", params.statusFilter);
  const data = await apiFetch<unknown>(
    `/api/v1/parametros/change-requests?${query.toString()}`,
    { signal: params.signal },
  );
  return parseNumberedPage<ParameterChangeRequest>(data, "solicitações de parâmetros");
}

export async function reviewChangeRequest(
  id: number,
  decision: "approved" | "rejected"
): Promise<void> {
  const endpoint = decision === "approved" ? "approve" : "reject";
  await apiFetch(`/api/v1/parametros/change-requests/${id}/${endpoint}`, { method: "POST" });
}

interface ParameterFieldsInput {
  chave: string;
  tipo: string;
  valor: string;
  descricao: string;
}

export async function requestParameterCreation(input: ParameterFieldsInput): Promise<void> {
  const payload = {
    change_type: "create",
    proposed_payload: {
      chave: input.chave,
      tipo: input.tipo,
      valor: input.valor,
      descricao: input.descricao,
    },
    justification: "Criação de novo parâmetro solicitada via painel",
  };
  await apiFetch("/api/v1/parametros/change-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestParameterUpdate(
  parameterId: number,
  input: ParameterFieldsInput
): Promise<void> {
  const payload = {
    change_type: "update",
    parameter_id: parameterId,
    proposed_payload: {
      chave: input.chave,
      tipo: input.tipo,
      valor: input.valor,
      descricao: input.descricao,
    },
    justification: "Edição solicitada via painel",
  };
  await apiFetch("/api/v1/parametros/change-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestParameterDeletion(parameterId: number): Promise<void> {
  const payload = {
    change_type: "delete",
    parameter_id: parameterId,
    justification: "Exclusão solicitada via painel",
  };
  await apiFetch("/api/v1/parametros/change-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
