"use client";

import { useSyncExternalStore } from "react";

// Não há estado externo para assinar: o valor nasce `false` (servidor +
// primeiro render do cliente) e vira `true` assim que a hidratação termina.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Sinaliza que o componente já hidratou, para segurar conteúdo que só existe no
 * cliente (sessão, preferências) até o HTML do servidor e o do cliente
 * coincidirem.
 *
 * Usa `useSyncExternalStore` — o mesmo escape hatch do `sidebar-context` — em
 * vez de `setState` dentro de `useEffect`, que dispara render em cascata e é
 * barrado pelo lint do React Compiler.
 */
export function useHasHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
