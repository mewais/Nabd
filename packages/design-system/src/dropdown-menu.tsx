import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import type { Option, OptionValue } from "./option";
import { rovingTarget } from "./roving";
import { pad } from "./styles";
import { COLOR, FONT_WEIGHT, HAIRLINE, RADIUS, SHADOW, SPACE, TEXT, Z, tint } from "./tokens";

interface DropdownMenuProps<V extends OptionValue> {
  options: readonly Option<V>[];
  /** The chosen option's value. */
  value: V;
  /** Names the listbox for assistive tech. */
  ariaLabel?: string;
  /** An option was picked. */
  onPick: (value: V) => void;
  /** A click outside the menu. */
  onDismiss: () => void;
}

const MENU: CSSProperties = {
  position: "absolute",
  top: `calc(100% + ${SPACE.xs}px)`,
  left: 0,
  right: 0,
  zIndex: Z.popover + 1,
  maxHeight: 220,
  overflowY: "auto",
  scrollbarWidth: "thin",
  background: COLOR.modal,
  border: HAIRLINE,
  borderRadius: RADIUS.control,
  boxShadow: SHADOW.popover,
};

function optionStyle(selected: boolean): CSSProperties {
  return {
    ...TEXT.controlLg,
    display: "block",
    width: "100%",
    padding: pad("sm", "md"),
    textAlign: "left",
    fontWeight: selected ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
    color: selected ? COLOR.accent : COLOR.text,
    background: selected ? tint(COLOR.accent, "soft") : COLOR.none,
  };
}

/** The option after `from` whose label starts with `key`, wrapping round; null when none does. */
function typedAhead(key: string, from: number, labels: readonly string[]): number | null {
  if (key.length !== 1) return null;
  const letter = key.toLowerCase();
  for (let offset = 1; offset <= labels.length; offset++) {
    const index = (from + offset) % labels.length;
    if (labels[index]?.toLowerCase().startsWith(letter)) return index;
  }
  return null;
}

/**
 * The open menu of a {@link Dropdown}: a listbox over a backdrop that dismisses
 * it. It opens with focus on the chosen option; the arrows, Home and End move
 * between options, a letter moves to the next option starting with it, and
 * Enter (or Space) picks the option.
 */
export function DropdownMenu<V extends OptionValue>({
  options,
  value,
  ariaLabel,
  onPick,
  onDismiss,
}: DropdownMenuProps<V>): JSX.Element {
  const menu = useRef<HTMLDivElement>(null);
  const chosen = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const items = (): HTMLElement[] => [
    ...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
  ];
  // On opening, focus goes to the option that is the tab stop: the chosen one.
  useEffect(() => menu.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const from = items().findIndex((item) => item === document.activeElement);
    const target =
      rovingTarget(
        event.key,
        from,
        options.map(() => true),
      ) ??
      typedAhead(
        event.key,
        from,
        options.map((option) => option.label),
      );
    if (target === null) return;
    event.preventDefault();
    items()[target]?.focus();
  };

  return (
    <>
      <div
        data-dropdown-backdrop
        onClick={onDismiss}
        style={{ position: "fixed", inset: 0, zIndex: Z.popover }}
      />
      <div ref={menu} role="listbox" aria-label={ariaLabel} onKeyDown={onKeyDown} style={MENU}>
        {options.map((option, index) => (
          <ButtonBase
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            tabIndex={index === chosen ? 0 : -1}
            onClick={() => onPick(option.value)}
            style={optionStyle(option.value === value)}
          >
            {option.label}
          </ButtonBase>
        ))}
      </div>
    </>
  );
}
