import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import { DropdownMenu } from "./dropdown-menu";
import { Icon } from "./icon";
import type { Option, OptionValue } from "./option";
import { COLOR, QUIET_BOX, RADIUS, SPACE, TEXT } from "./tokens";
import { useEscapeKey } from "./use-escape-key";

interface DropdownProps<V extends OptionValue = string> {
  value: V;
  options: readonly Option<V>[];
  onChange: (value: V) => void;
  /** Names the trigger for assistive tech. */
  ariaLabel?: string;
}

const TRIGGER: CSSProperties = {
  ...QUIET_BOX,
  ...TEXT.controlLg,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: RADIUS.control,
  padding: SPACE.md,
  color: COLOR.text,
  textAlign: "left",
};

/** Keys on the closed trigger that open the menu, as they would a native select. */
const OPENING_KEYS = new Set(["ArrowDown", "ArrowUp"]);

/**
 * A select whose menu is drawn by the app instead of the OS. Picking an option,
 * clicking outside or pressing Escape closes the menu.
 *
 * To the keyboard it is a listbox: ↓ or ↑ on the trigger opens it on the
 * chosen option (see {@link DropdownMenu} for moving inside it); Escape closes
 * without picking. Either way focus returns to the trigger.
 */
export function Dropdown<V extends OptionValue = string>({
  value,
  options,
  onChange,
  ariaLabel,
}: DropdownProps<V>): JSX.Element {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

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
          <Icon name="chevron-down" size="sm" weight="bold" tone="faint" />
        </ButtonBase>
      </div>
      {open && (
        <DropdownMenu
          options={options}
          value={value}
          ariaLabel={ariaLabel}
          onPick={(picked) => {
            onChange(picked);
            close();
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </div>
  );
}
