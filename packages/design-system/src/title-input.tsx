import { FIELD_CLASS } from "./global-styles";
import { COLOR, RADIUS, TEXT } from "./tokens";

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name: what is being named. */
  ariaLabel: string;
  /** `lg` for a screen's title, `md` for a panel's. */
  size?: "md" | "lg";
}

const SIZES = {
  md: { ...TEXT.heading, width: 160 },
  lg: { ...TEXT.title, width: 280 },
} as const;

/** A heading the user renames in place: it reads as a title and edits as a field. */
export function TitleInput({
  value,
  onChange,
  ariaLabel,
  size = "lg",
}: TitleInputProps): JSX.Element {
  return (
    <input
      type="text"
      className={FIELD_CLASS}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...SIZES[size],
        padding: 0,
        fontFamily: "inherit",
        color: COLOR.text,
        background: COLOR.none,
        border: "none",
        borderRadius: RADIUS.tag,
      }}
    />
  );
}
