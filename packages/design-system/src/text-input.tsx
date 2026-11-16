import { InputBase } from "./input-base";
import { pad } from "./styles";
import { QUIET_BOX, RADIUS, SPACE, TEXT } from "./tokens";
import type { Size } from "./tokens";

/** `sm` for inline notes inside a card. */
type TextInputSize = Extract<Size, "sm" | "md">;

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** `search` makes it a search box. */
  type?: "text" | "search";
  size?: TextInputSize;
  /** Accessible name, when there is no visible label. */
  ariaLabel?: string;
}

const SIZES = {
  sm: { ...TEXT.controlSm, borderRadius: RADIUS.chip, padding: pad("sm", "md") },
  md: { ...TEXT.controlLg, borderRadius: RADIUS.control, padding: SPACE.md },
} as const satisfies Record<TextInputSize, object>;

/** A single-line text field that fills its container. */
export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  size = "md",
  ariaLabel,
}: TextInputProps): JSX.Element {
  return (
    <InputBase
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{ ...QUIET_BOX, ...SIZES[size], width: "100%" }}
    />
  );
}
