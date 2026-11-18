import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import type { Option, OptionValue } from "./option";
import { rovingTarget } from "./roving";
import { pad } from "./styles";
import { COLOR, FLOATING_BOX, FONT_WEIGHT, RADIUS, SHADOW, SPACE, TEXT, Z, tint } from "./tokens";

/**
 * What the list is to assistive tech, and how it hangs under its button:
 *  - `listbox`: the options of a select, one of them chosen (`value`), as wide as the button;
 *  - `menu`: actions, none chosen, as wide as they need, from the button's end.
 */
type DropdownMenuKind<V extends OptionValue> =
  | { role: "listbox"; value: V }
  | { role: "menu"; value?: never };

type DropdownMenuProps<V extends OptionValue> = DropdownMenuKind<V> & {
  options: readonly Option<V>[];
  /** Names the list for assistive tech. */
  ariaLabel?: string | undefined;
  /** An option was picked. */
  onPick: (value: V) => void;
  /** A click outside the list. */
  onDismiss: () => void;
};

const ITEM_ROLE = { listbox: "option", menu: "menuitem" } as const;

const PLACEMENT: Record<DropdownMenuKind<OptionValue>["role"], CSSProperties> = {
  listbox: { left: 0, right: 0 },
  menu: { right: 0, minWidth: "100%", whiteSpace: "nowrap" },
};

const MENU: CSSProperties = {
  position: "absolute",
  top: `calc(100% + ${SPACE.xs}px)`,
  zIndex: Z.popover + 1,
  maxHeight: 220,
  overflowY: "auto",
  scrollbarWidth: "thin",
  ...FLOATING_BOX,
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
 * The open list of a {@link Dropdown} (a listbox) or a {@link MenuButton} (a
 * menu), over a backdrop that dismisses it. It opens with focus on the chosen
 * option, or a menu's first item; the arrows, Home and End move between
 * options, a letter moves to the next option starting with it, and Enter (or
 * Space) picks the option.
 */
export function DropdownMenu<V extends OptionValue>({
  role,
  options,
  value,
  ariaLabel,
  onPick,
  onDismiss,
}: DropdownMenuProps<V>): JSX.Element {
  const menu = useRef<HTMLDivElement>(null);
  const itemRole = ITEM_ROLE[role];
  const isChosen = (option: Option<V>): boolean => role === "listbox" && option.value === value;
  const chosen = Math.max(0, options.findIndex(isChosen));
  const items = (): HTMLElement[] => [
    ...(menu.current?.querySelectorAll<HTMLElement>(`[role="${itemRole}"]`) ?? []),
  ];
  // On opening, focus goes to the option that is the tab stop: the chosen one, or the first.
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
      <div
        ref={menu}
        role={role}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        style={{ ...MENU, ...PLACEMENT[role] }}
      >
        {options.map((option, index) => (
          <ButtonBase
            key={option.value}
            role={itemRole}
            aria-selected={role === "listbox" ? isChosen(option) : undefined}
            tabIndex={index === chosen ? 0 : -1}
            onClick={() => onPick(option.value)}
            style={optionStyle(isChosen(option))}
          >
            {option.label}
          </ButtonBase>
        ))}
      </div>
    </>
  );
}
