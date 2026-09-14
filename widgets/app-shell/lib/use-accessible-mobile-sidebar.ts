"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface UseAccessibleMobileSidebarOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UseAccessibleMobileSidebarResult {
  dialogRef: RefObject<HTMLElement | null>;
  isMobileViewport: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Só desfazemos o que nós mesmos aplicamos. O `<header>` mobile já recebe
 * `inert` do próprio React quando o menu abre — se o hook "restaurasse" esse
 * atributo no cleanup, ele o reescreveria depois do React tê-lo removido e o
 * header ficaria inerte para sempre (burger e todo o topo mortos no 2º clique).
 */
type IsolatedElementState = {
  element: HTMLElement;
  ownsInert: boolean;
  ownsAriaHidden: boolean;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.closest('[hidden], [aria-hidden="true"], [inert], .hidden'),
  );
}

function getElementsOutsideDialog(dialog: HTMLElement): HTMLElement[] {
  const elements = new Set<HTMLElement>();
  let current: HTMLElement | null = dialog;

  while (current?.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (
        sibling instanceof HTMLElement &&
        sibling !== current &&
        !sibling.matches("[data-mobile-sidebar-backdrop]")
      ) {
        elements.add(sibling);
      }
    }

    current = current.parentElement;
    if (current === document.body) break;
  }

  return [...elements];
}

/**
 * Dá à sidebar responsiva o comportamento modal de teclado/foco no mobile sem
 * duplicar a árvore de navegação do desktop. Portado do manager do Ara
 * (`features/navigation/hooks/use-accessible-mobile-sidebar.ts`).
 */
export function useAccessibleMobileSidebar({
  open,
  onOpenChange,
}: UseAccessibleMobileSidebarOptions): UseAccessibleMobileSidebarResult {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches && open) {
        onOpenChange(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open || !isMobileViewport) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const outsideElements = getElementsOutsideDialog(dialog);
    const previousOutsideState: IsolatedElementState[] = outsideElements.map(
      (element) => ({
        element,
        ownsInert: !element.hasAttribute("inert"),
        ownsAriaHidden: !element.hasAttribute("aria-hidden"),
      }),
    );
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    previousOutsideState.forEach(({ element, ownsInert, ownsAriaHidden }) => {
      if (ownsInert) element.setAttribute("inert", "");
      if (ownsAriaHidden) element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus =
        dialog.querySelector<HTMLElement>(
          "[data-mobile-sidebar-initial-focus]",
        ) ??
        getFocusableElements(dialog)[0] ??
        dialog;
      initialFocus.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousOutsideState.forEach(({ element, ownsInert, ownsAriaHidden }) => {
        if (ownsInert) element.removeAttribute("inert");
        if (ownsAriaHidden) element.removeAttribute("aria-hidden");
      });

      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) {
          trigger.focus();
        } else if (previouslyFocused?.isConnected) {
          previouslyFocused.focus();
        }
      });
    };
  }, [isMobileViewport, onOpenChange, open]);

  return {
    dialogRef,
    isMobileViewport,
    triggerRef,
  };
}
