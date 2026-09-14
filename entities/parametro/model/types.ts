export interface Parameter {
  id: number;
  name: string;
  type: string;
  value: string;
  unit: string;
  limits: string;
  limitsDetail: string;
  description: string;
  status: string;
}

export interface ParameterEditDraft {
  id: number;
  nome: string;
  tipo: string;
  valor: string;
  descricao: string;
}

export interface ParameterHistoryItem {
  id: number;
  date: string;
  parameter: string;
  requester: string;
  decision: string;
  admin: string;
  notes: string;
}

// Espelha ChangeRequestOut do backend (app/modules/parametros/schemas.py).
// requested_by/reviewed_by são IDs de auth_users — o front ainda não resolve
// para nome/e-mail (exigiria GET /api/auth/users, restrito a admin_tecnico).
export interface ParameterChangeRequest {
  id: number;
  requested_by: number | null;
  target_chave: string | null;
  change_type: 'create' | 'update' | 'delete';
  proposed_payload: Record<string, unknown>;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Shape de apresentação de uma ParameterChangeRequest pendente numa linha de
// tabela (produzido por toRequestRow em usuarios/page.tsx). Vive aqui, e não
// fundido com UsuarioRow, para que a tabela de usuários possa compor os dois
// sem misturar os domínios no modelo de tipos.
export interface ParametroRequestRow {
  id: string;
  parameterRequestId: number;
  title: string;
  subtitle: string;
  requester: string;
  date: string;
}
