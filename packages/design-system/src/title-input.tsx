import { InputBase } from "./input-base";
import { COLOR, RADIUS, TEXT } from "./tokens";
import type { Size } from "./tokens";

/** `lg` for a screen's title, `md` for a panel's. */
type TitleInputSize = Extract<Size, "md" | "lg">;

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name: what is being named. */
  ariaLabel: string;
  size?: TitleInputSize;
}

const SIZES = {
  md: { ...TEXT.heading, width: 160 },
  lg: { ...TEXT.title, width: 280 },
} as const satisfies Record<TitleInputSize, object>;

/** A heading the user renames in place: it reads as a title and edits as a field. */
export function TitleInput({
  value,
  onChange,
  ariaLabel,
  size = "lg",
}: TitleInputProps): JSX.Element {
  return (
    <InputBase
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...SIZES[size],
        padding: 0,
        background: COLOR.none,
        border: "none",
        borderRadius: RADIUS.tag,
      }}
    />
  );
}
