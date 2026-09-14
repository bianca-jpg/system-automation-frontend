// Reexport do Badge do design-system. `badgeVariants` (as classes CVA) NÃO é
// parte da API pública do pacote — o barrel `components/ui/badge/index.ts`
// exporta só `Badge` e o tipo `BadgeVariant` de propósito. O reexport anterior
// pedia `badgeVariants` e ninguém no app o consumia.
export { Badge } from '@system-automation/design-system';
export type { BadgeVariant } from '@system-automation/design-system';
