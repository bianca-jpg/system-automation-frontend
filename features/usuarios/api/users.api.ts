import { apiFetch } from "@/lib/api/http-client";
import type { AdminUser } from "@/entities/usuario/model/types";
import type { automationRole } from "@/shared/config/auth/automation-roles";
import { parseNumberedPage, type NumberedPage } from "@/shared/types/numbered-page";

type UsersSort = "id" | "email" | "role" | "confirmedAt";

export async function fetchUsers(
  params: {
    page: number;
    pageSize?: number;
    search?: string;
    sort?: UsersSort;
    order?: "asc" | "desc";
    signal?: AbortSignal;
  },
): Promise<NumberedPage<AdminUser>> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? 25),
    search: (params.search ?? "").slice(0, 120),
    sort: params.sort ?? "id",
    order: params.order ?? "asc",
  });
  const data = await apiFetch<unknown>(`/api/auth/users?${query.toString()}`, {
    signal: params.signal,
  });
  return parseNumberedPage<AdminUser>(data, "usuários");
}

export async function updateUserRole(userId: number, role: automationRole): Promise<void> {
  await apiFetch(`/api/auth/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roles: [role] }),
  });
}

export async function deleteUser(userId: number): Promise<void> {
  await apiFetch(`/api/auth/users/${userId}`, { method: "DELETE" });
}
