import type { CSSProperties } from "react";
import { ButtonBase } from "./button-base";
import { DropdownMenu } from "./dropdown-menu";
import { Icon } from "./icon";
import type { Option, OptionValue } from "./option";
import { COLOR, QUIET_BOX, RADIUS, SPACE, TEXT } from "./tokens";
import { CENTERED_ROW } from "./styles";
import { usePopup } from "./use-popup";

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
  ...CENTERED_ROW,
  justifyContent: "space-between",
  borderRadius: RADIUS.control,
  padding: SPACE.md,
  color: COLOR.text,
  textAlign: "left",
};

/**
 * A select whose menu is drawn by the app instead of the OS. Picking an option,
 * clicking outside or pressing Escape closes the menu.
 *
 * To the keyboard it is a listbox: ↓ or ↑ on the trigger opens it on the
 * chosen option (see {@link usePopup}, and {@link DropdownMenu} for moving
 * inside it); Escape closes without picking. Either way focus returns to the
 * trigger.
 */
export function Dropdown<V extends OptionValue = string>({
  value,
  options,
  onChange,
  ariaLabel,
}: DropdownProps<V>): JSX.Element {
  const { open, toggle, close, dismiss, trigger, onTriggerKey } = usePopup();
  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={trigger} onKeyDown={onTriggerKey}>
        <ButtonBase
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={toggle}
          style={TRIGGER}
        >
          <span>{selectedLabel}</span>
          <Icon name="chevron-down" size="sm" weight="bold" tone="faint" />
        </ButtonBase>
      </div>
      {open && (
        <DropdownMenu
          role="listbox"
          options={options}
          value={value}
          ariaLabel={ariaLabel}
          onPick={(picked) => {
            onChange(picked);
            close();
          }}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
