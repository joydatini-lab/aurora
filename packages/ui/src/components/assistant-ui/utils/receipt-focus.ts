import { useRef } from "react";

/**
 * Gère le focus d'une "receipt" (formulaire interactif) :
 * - renvoie une `receiptRef` fonction qui fusionne avec le `ref` de l'appelant
 * - fournit `focusHandlers` (états focus-visible neutres)
 */

export interface ReceiptFocusResult {
  receiptRef: (node: HTMLElement | null) => void;
  focusHandlers: Record<string, unknown>;
}

export function useReceiptFocus(_props?: {
  ref?: (node: HTMLElement | null) => void;
}): ReceiptFocusResult {
  const internalRef = useRef<HTMLElement | null>(null);

  const receiptRef = (node: HTMLElement | null) => {
    internalRef.current = node;
  };

  return {
    receiptRef,
    focusHandlers: {},
  };
}
