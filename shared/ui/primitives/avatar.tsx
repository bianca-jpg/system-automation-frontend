// `AvatarImage` entra junto de propósito, embora nada renderize foto ainda: o
// Entra ID não manda imagem no ID token, então a foto depende do Microsoft
// Graph (`GET /me/photo/$value`), que ainda não está integrado. Reexportar
// agora deixa a fachada completa em relação ao design system e evita que o
// próximo passo precise mexer aqui — a peça que falta é a fonte, não a UI.
export { Avatar, AvatarImage, AvatarFallback } from '@system-automation/design-system';
