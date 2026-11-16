import { RADIUS, SURFACE2_BOX } from "./tokens";

export interface TextInputProps {
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
  sm: { borderRadius: RADIUS.chip, padding: "9px 11px", fontSize: 12.5 },
  md: { borderRadius: RADIUS.field, padding: "12px 13px", fontSize: 14 },
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
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...SURFACE2_BOX,
        ...SIZES[size],
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
        color: "var(--text)",
        outline: "none",
      }}
    />
  );
}
