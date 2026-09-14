// Adaptador do `Typography` do design system. Ele mora neste arquivo (e não em
// um `typography.tsx` próprio) porque o Windows não distingue os dois nomes.
//
// O `Subtitle` (papel "eyebrow", código autoral) saiu daqui para
// `@/shared/ui/composite/Subtitle`: `primitives/` é reexport de uma linha.
export { Typography } from "@system-automation/design-system";
