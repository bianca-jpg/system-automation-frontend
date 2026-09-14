# automation - OR — Front-end

Otimização de OR (ordem de reserva) e automação da adequação.

Aplicação Next.js 16 (arquitetura FSD) que consome a API do back-end e
apresenta os pedidos, a adequação de grade e o histórico de Ordens de Reserva.

## Documentação

| Página | Conteúdo |
|--------|----------|
| [Arquitetura](architecture.md) | Camadas FSD, consumo da API e filtros da tela |
| [Design System](design-system.md) | Consumo do DS compartilhado, tokens, tema, fonte e sync |
| [Regra de coleção](colecao.md) | Coleção vigente/próxima (muda a cada 6 meses) |

## Stack

- Next.js 16, React 19, TypeScript
- Arquitetura FSD (Feature-Sliced Design)
- UI e tokens do design system compartilhado (`@system-automation/design-system`),
  consumidos pela camada adaptadora `shared/ui/`
- Auth via NextAuth; API via `lib/api` (fetch com Bearer token)

## Como rodar

Setup, scripts e credenciais de dev estão no
[`README.md`](https://github.com/your-org/frontend#readme).
O front espera a API em `NEXT_PUBLIC_API_URL` (padrão `http://localhost:8000`).
