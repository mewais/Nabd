import { useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "./icon";
import type { Option } from "./option";
import { RADIUS, SHADOW, SURFACE2_BOX, Z, tint } from "./tokens";
import { useEscapeKey } from "./use-escape-key";

interface DropdownProps<V extends string = string> {
  value: V;
  options: readonly Option<V>[];
  onChange: (value: V) => void;
  /** Names the trigger for assistive tech. */
  ariaLabel?: string;
}

const TRIGGER: CSSProperties = {
  ...SURFACE2_BOX,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: RADIUS.field,
  padding: "12px 34px 12px 13px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "var(--text)",
  textAlign: "left",
  cursor: "pointer",
};

const MENU: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: Z.popover + 1,
  maxHeight: 220,
  overflowY: "auto",
  scrollbarWidth: "thin",
  background: "var(--modal-bg)",
  border: "1px solid var(--line)",
  borderRadius: RADIUS.field,
  boxShadow: SHADOW.popover,
};

function optionStyle(selected: boolean): CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "10px 13px",
    border: "none",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: selected ? 600 : 400,
    color: selected ? "var(--accent)" : "var(--text)",
    background: selected ? tint("var(--accent)", 15) : "transparent",
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
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        style={TRIGGER}
      >
        <span>{selectedLabel}</span>
        <Icon name="chevron-down" size={14} strokeWidth={2.2} stroke="var(--text3)" />
      </button>
      {open && (
        <>
          <div
            data-dropdown-backdrop
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: Z.popover }}
          />
          <div role="listbox" aria-label={ariaLabel} style={MENU}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={optionStyle(option.value === value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
