import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import { Icon } from "./icon";
import type { Option } from "./option";
import { COLOR, FONT_SIZE, HAIRLINE, QUIET_BOX, RADIUS, SHADOW, SPACE, Z, tint } from "./tokens";
import { rovingTarget } from "./roving";
import { useEscapeKey } from "./use-escape-key";

interface DropdownProps<V extends string = string> {
  value: V;
  options: readonly Option<V>[];
  onChange: (value: V) => void;
  /** Names the trigger for assistive tech. */
  ariaLabel?: string;
}

const TRIGGER: CSSProperties = {
  ...QUIET_BOX,
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: RADIUS.control,
  padding: SPACE.md,
  fontSize: FONT_SIZE.medium,
  color: COLOR.text,
  textAlign: "left",
};

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
    display: "block",
    width: "100%",
    padding: `${SPACE.sm}px ${SPACE.md}px`,
    textAlign: "left",
    fontSize: FONT_SIZE.medium,
    fontWeight: selected ? 600 : 400,
    color: selected ? COLOR.accent : COLOR.text,
    background: selected ? tint(COLOR.accent, "soft") : COLOR.none,
  };
}

/** Keys on the closed trigger that open the menu, as they would a native select. */
const OPENING_KEYS = new Set(["ArrowDown", "ArrowUp"]);

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
 * A select whose menu is drawn by the app instead of the OS. Picking an option,
 * clicking outside or pressing Escape closes the menu.
 *
 * To the keyboard it is a listbox: ↓ or ↑ on the trigger opens it on the
 * chosen option; inside, the arrows, Home and End move between options, a
 * letter moves to the next option starting with it, Enter (or Space) picks
 * the option and Escape closes without picking. Either way focus returns to
 * the trigger.
 */
export function Dropdown<V extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
}: DropdownProps<V>): JSX.Element {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const chosen = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  const focusOption = (index: number): void =>
    menu.current?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus();
  const close = (): void => {
    setOpen(false);
    trigger.current?.querySelector("button")?.focus();
  };
  useEscapeKey(close, open);
  // On opening only, focus goes to the option that is the tab stop: the chosen one.
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [open]);

  const onTriggerKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (open || !OPENING_KEYS.has(event.key)) return;
    event.preventDefault();
    setOpen(true);
  };
  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const from = items.findIndex((item) => item === document.activeElement);
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
    focusOption(target);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={trigger} onKeyDown={onTriggerKey}>
        <ButtonBase
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => setOpen(!open)}
          style={TRIGGER}
        >
          <span>{selectedLabel}</span>
          <Icon name="chevron-down" size={14} strokeWidth={2.2} tone="faint" />
        </ButtonBase>
      </div>
      {open && (
        <>
          <div
            data-dropdown-backdrop
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: Z.popover }}
          />
          <div ref={menu} role="listbox" aria-label={ariaLabel} onKeyDown={onMenuKey} style={MENU}>
            {options.map((option, index) => (
              <ButtonBase
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                tabIndex={index === chosen ? 0 : -1}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                style={optionStyle(option.value === value)}
              >
                {option.label}
              </ButtonBase>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
