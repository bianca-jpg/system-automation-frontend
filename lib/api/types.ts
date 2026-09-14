export interface AuthUser {
  id: number;
  email: string;
  role: "basico" | "operacional" | "gestor" | "administrador" | "admin_tecnico";
  roles?: string[];
}
