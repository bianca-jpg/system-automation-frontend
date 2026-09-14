import "@testing-library/jest-dom/vitest";

// jsdom polyfills — mesmo motivo do ../design-system/vitest.setup.ts: jsdom não
// implementa ResizeObserver/IntersectionObserver/scrollIntoView, e vários
// componentes de @system-automation/design-system (consumidos via shared/ui/*) usam isso
// no mount. Sem os polyfills, testes que renderizam esses componentes lançam
// ReferenceError/TypeError antes mesmo de chegar na asserção.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root: Element | null = null;
  readonly rootMargin: string = "0px";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof globalThis.ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof globalThis.IntersectionObserver;
}

if (
  typeof Element !== "undefined" &&
  typeof Element.prototype.scrollIntoView !== "function"
) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    /* no-op para jsdom */
  };
}

// jsdom não faz layout: TODO elemento reporta offsetWidth/offsetHeight = 0.
// O virtualizador do `DynamicTable` (@tanstack/react-virtual) mede o container
// de rolagem por essas propriedades — medindo 0 de altura ele conclui que
// nenhuma linha cabe na viewport e renderiza um <tbody> VAZIO. Ou seja: sem
// este polyfill, todo teste de tabela do design system passa a asseverar sobre
// uma tabela sem linhas (e "não encontrou o texto" viraria falso negativo, não
// regressão real).
//
// A viewport fictícia abaixo (1024x800) cabe ~17 linhas de 45px, mais que o
// `itemsPerPage` padrão — o suficiente para os testes verem todas as linhas.
// Só definimos quando o valor é o zero fixo do jsdom, para não sobrescrever um
// ambiente que realmente calcule layout.
if (typeof HTMLElement !== "undefined") {
  const JSDOM_VIEWPORT = { offsetWidth: 1024, offsetHeight: 800 } as const;

  for (const [property, value] of Object.entries(JSDOM_VIEWPORT)) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      property,
    );

    if (descriptor?.get?.call(document.createElement("div")) === 0) {
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        get: () => value,
      });
    }
  }
}
