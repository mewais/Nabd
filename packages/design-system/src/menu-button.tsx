import type { CSSProperties } from "react";
import { ButtonBase } from "./button-base";
import { buttonStyle, defaultTone } from "./button";
import type { ButtonSize } from "./button";
import { DropdownMenu } from "./dropdown-menu";
import { Icon } from "./icon";
import type { Option, OptionValue } from "./option";
import type { Tone } from "./tokens";
import { usePopup } from "./use-popup";

interface MenuButtonProps<V extends OptionValue> {
  /** What the button says: where what its actions change stands ("Pause", "Paused"). */
  label: string;
  /** The actions, each a value handed to `onPick` and the words it is listed under. */
  items: readonly Option<V>[];
  /** An action was picked. */
  onPick: (value: V) => void;
  /** `primary` for a button whose state wants noticing; `secondary` otherwise. */
  variant?: "primary" | "secondary";
  size?: ButtonSize;
  /** Colour. Defaults to `accent` when primary, `neutral` otherwise. */
  tone?: Tone;
  /** Accessible name of the button and its menu, when the label is not enough. */
  ariaLabel?: string;
}

const WRAP: CSSProperties = { position: "relative", display: "inline-flex" };

/**
 * A button that opens a short menu of actions — no value is chosen, so the
 * button says what it likes (where things stand) and a pick runs the action
 * and closes the menu. Clicking outside or pressing Escape closes it too.
 *
 * To the keyboard it is a menu button: Enter, Space or ↓ opens the menu on
 * its first item (see {@link usePopup}, and {@link DropdownMenu} for moving
 * inside it), and focus returns to the button when it closes.
 */
export function MenuButton<V extends OptionValue>({
  label,
  items,
  onPick,
  variant = "secondary",
  size = "lg",
  tone = defaultTone(variant),
  ariaLabel,
}: MenuButtonProps<V>): JSX.Element {
  const { open, toggle, close, dismiss, trigger, onTriggerKey } = usePopup();
  return (
    <div style={WRAP}>
      <div ref={trigger} onKeyDown={onTriggerKey}>
        <ButtonBase
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={toggle}
          style={buttonStyle(variant, size, tone)}
        >
          {label}
          <Icon name="chevron-down" size="xs" weight="bold" />
        </ButtonBase>
      </div>
      {open && (
        <DropdownMenu
          role="menu"
          options={items}
          ariaLabel={ariaLabel ?? label}
          onPick={(picked) => {
            close();
            onPick(picked);
          }}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
