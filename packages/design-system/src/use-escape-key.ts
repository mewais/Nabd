import { useEffect, useRef } from "react";

/** Open layers that close on Escape, innermost last. */
const layers: Array<() => void> = [];

function closeInnermost(event: KeyboardEvent): void {
  if (event.key === "Escape") layers[layers.length - 1]?.();
}

/**
 * Calls `onEscape` when Escape is pressed, while `enabled`. Only the layer
 * opened last reacts, so Escape closes a menu before the modal it sits in, and
 * a modal before the one beneath it.
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  const latest = useRef(onEscape);
  latest.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const layer = (): void => latest.current();
    if (layers.length === 0) document.addEventListener("keydown", closeInnermost);
    layers.push(layer);
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      if (layers.length === 0) document.removeEventListener("keydown", closeInnermost);
    };
  }, [enabled]);
}
