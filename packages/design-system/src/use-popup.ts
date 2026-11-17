import { useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useEscapeKey } from "./use-escape-key";

/** The open/closed state of a button's popup list (see {@link DropdownMenu}), and its keyboard. */
interface Popup {
  open: boolean;
  /** Open it, or close it again: a click on the button. */
  toggle: () => void;
  /** Close it and give focus back to the button: a pick, or Escape. */
  close: () => void;
  /** Close it where focus is: a click outside. */
  dismiss: () => void;
  /** Wraps the button, so that focus can be given back to it. */
  trigger: RefObject<HTMLDivElement>;
  /** The keys on the closed button that open the list, as they would a native select. */
  onTriggerKey: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** Keys on the closed button that open the list: Enter and Space click it already. */
const OPENING_KEYS = new Set(["ArrowDown", "ArrowUp"]);

/**
 * The behaviour a button that opens a list shares, whether the list picks a
 * value (Dropdown) or runs an action (MenuButton): ↓ or ↑ on the button
 * opens it, Escape closes it (before any modal it sits in), and either way
 * focus returns to the button.
 */
export function usePopup(): Popup {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    trigger.current?.querySelector("button")?.focus();
  };
  useEscapeKey(close, open);

  const onTriggerKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (open || !OPENING_KEYS.has(event.key)) return;
    event.preventDefault();
    setOpen(true);
  };

  return {
    open,
    toggle: () => setOpen(!open),
    close,
    dismiss: () => setOpen(false),
    trigger,
    onTriggerKey,
  };
}
