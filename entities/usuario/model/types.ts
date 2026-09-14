export interface AdminUser {
  id: number;
  email: string;
  roles: string[];
  confirmed_at: string | null;
}

// Shape de apresentação de um AdminUser numa linha de tabela (produzido por
// toUserRow em usuarios/page.tsx). Vive aqui, e não fundido com
// ParametroRequestRow, para que a tabela de usuários possa compor os dois sem
// misturar os domínios no modelo de tipos.
export interface UsuarioRow {
  id: number;
  title: string;
  roles: string[];
  confirmedAt: string | null;
}
