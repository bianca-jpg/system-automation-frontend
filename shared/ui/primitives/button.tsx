// `buttonVariants` (as classes CVA) NÃO faz parte da API pública do pacote —
// mesma decisão já registrada em `badge.tsx` e `pressable.tsx`. Quem precisa de
// "um Link com aparência de botão" usa `<Button asChild>`; quem precisa de outra
// aparência usa as props `variant`/`size`, não as classes por baixo delas.
export { Button } from '@system-automation/design-system';
