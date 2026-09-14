// Superfície de UI compartilhada.
//
// Regra deste barril: um nome, um componente. Antes `@/shared/ui` entregava um
// `Button` (o wrapper `FormButton`, vocabulário `primary`/`danger`/`inline`) e
// `@/shared/ui/button` entregava OUTRO (o do design system, vocabulário
// `default`/`destructive`/`sm`) — mover um trecho de JSX entre dois arquivos
// compilava e mudava a aparência em silêncio. O mesmo valia para `Input`.
//
// Agora `Button` é sempre o do design system, e o wrapper de autofill sai pelo
// nome próprio (`FormInput`), que é o que ele é.
export { Button } from "./button";
export { Card } from "./primitives/card";
export { FormInput } from "./composite/FormInput";
export { Panel } from "./composite/Panel";
export { Field } from "./composite/Field";
export { BrandWordmark } from "./composite/BrandWordmark";
export { AuthParticleField } from "./primitives/auth-particle-field";
export { LogoWithTitle } from "./primitives/logo-with-title";
export { Progress } from "./primitives/progress";
