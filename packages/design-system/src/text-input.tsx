import { FIELD_CLASS } from "./global-styles";
import { COLOR, FONT_SIZE, QUIET_BOX, RADIUS, SPACE } from "./tokens";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** `search` makes it a search box. */
  type?: "text" | "search";
  /** `sm` for inline notes inside a card. */
  size?: "sm" | "md";
  /** Accessible name, when there is no visible label. */
  ariaLabel?: string;
}

const SIZES = {
  sm: {
    borderRadius: RADIUS.chip,
    padding: `${SPACE.sm}px ${SPACE.md}px`,
    fontSize: FONT_SIZE.small,
  },
  md: { borderRadius: RADIUS.control, padding: SPACE.md, fontSize: FONT_SIZE.medium },
} as const;

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
    <input
      type={type}
      className={FIELD_CLASS}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...QUIET_BOX,
        ...SIZES[size],
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
        color: COLOR.text,
      }}
    />
  );
}
