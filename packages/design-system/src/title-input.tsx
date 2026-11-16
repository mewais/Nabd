import { TEXT } from "./tokens";

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name: what is being named. */
  ariaLabel: string;
  /** `lg` for a screen's title, `md` for a panel's. */
  size?: "md" | "lg";
  /** Width in px. */
  width?: number;
}

const FONT_SIZE = { md: 18, lg: 22 } as const;

/** A heading the user renames in place: it reads as a title and edits as a field. */
export function TitleInput({
  value,
  onChange,
  ariaLabel,
  size = "lg",
  width = 280,
}: TitleInputProps): JSX.Element {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...TEXT.title,
        fontSize: FONT_SIZE[size],
        width,
        padding: 0,
        fontFamily: "inherit",
        color: "var(--text)",
        background: "transparent",
        border: "none",
        outline: "none",
      }}
    />
  );
}
