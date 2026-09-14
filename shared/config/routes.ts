type AppSectionId =
  | "visao-geral"
  | "pedidos"
  | "historico"
  | "alertas"
  | "parametros"
  | "configuracoes-parametros"
  | "usuarios";

export const routes = {
  login: "/login",
  visaoGeral: "/visao-geral",
  pedidos: "/pedidos",
  historico: "/historico",
  alertas: "/alertas",
  parametros: "/parametros",
  configuracoesParametros: "/configuracoes-parametros",
  usuarios: "/usuarios",
} as const;

export function pathToSection(pathname: string): AppSectionId {
  if (pathname.includes(routes.pedidos)) return "pedidos";
  if (pathname.includes(routes.historico)) return "historico";
  if (pathname.includes(routes.alertas)) return "alertas";
  // Antes de `parametros`: as duas rotas terminam na mesma palavra, e trocar a
  // ordem faria a aba de configurações acender o item "Parâmetros" no sidebar.
  if (pathname.includes(routes.configuracoesParametros)) return "configuracoes-parametros";
  if (pathname.includes(routes.parametros)) return "parametros";
  if (pathname.includes(routes.usuarios)) return "usuarios";
  return "visao-geral";
}
