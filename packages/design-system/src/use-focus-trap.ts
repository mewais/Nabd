import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

interface FocusTrap<E extends HTMLElement> {
  /** Goes on the element focus is kept in; it needs `tabIndex={-1}`. */
  ref: RefObject<E>;
  /** Goes on the same element. */
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Keeps keyboard focus inside a layer for as long as it is open: focus moves
 * into it when it opens, Tab and Shift+Tab go round inside it, and when it
 * closes focus returns to whatever had it before (the button that opened it).
 */
export function useFocusTrap<E extends HTMLElement>(): FocusTrap<E> {
  const ref = useRef<E>(null);

  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent): void => {
    const layer = ref.current;
    if (event.key !== "Tab" || layer === null) return;
    const stops = Array.from(layer.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    const leavingBackward = event.shiftKey && (active === first || active === layer);
    const leavingForward = !event.shiftKey && active === last;
    if (leavingBackward || leavingForward) {
      event.preventDefault();
      (leavingBackward ? last : first).focus();
    }
  };

  return { ref, onKeyDown };
}
