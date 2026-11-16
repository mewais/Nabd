import { useState } from "react";
import type { CSSProperties } from "react";
import { ButtonBase } from "./button-base";
import { Icon } from "./icon";
import type { Option } from "./option";
import { COLOR, FONT_SIZE, HAIRLINE, QUIET_BOX, RADIUS, SHADOW, SPACE, Z, tint } from "./tokens";
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

/**
 * A select whose menu is drawn by the app instead of the OS. Picking an option,
 * clicking outside or pressing Escape closes the menu.
 */
export function Dropdown<V extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
}: DropdownProps<V>): JSX.Element {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  useEscapeKey(() => setOpen(false), open);

  return (
    <div style={{ position: "relative", width: "100%" }}>
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
      {open && (
        <>
          <div
            data-dropdown-backdrop
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: Z.popover }}
          />
          <div role="listbox" aria-label={ariaLabel} style={MENU}>
            {options.map((option) => (
              <ButtonBase
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
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
