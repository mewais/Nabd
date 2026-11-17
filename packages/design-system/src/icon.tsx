import { ICON_PATHS } from "./icon-paths";
import type { IconName } from "./icon-paths";
import { ICON_SIZE, toneColor } from "./tokens";
import type { IconSize, Tone } from "./tokens";

interface IconProps {
  name: IconName;
  size?: IconSize;
  /** `neutral` (default) draws in the surrounding text colour. */
  tone?: Tone;
  /** How heavy its strokes are. */
  weight?: keyof typeof STROKE;
  /** Accessible name. Without one the icon is decorative and hidden from assistive tech. */
  ariaLabel?: string;
}

/** Stroke widths, in the icon's own 24-unit drawing. */
const STROKE = { thin: 1.7, regular: 2, bold: 2.2, heavy: 2.6, black: 3.4 } as const;

/** A stroke icon from the app's set. */
export function Icon({
  name,
  size = "md",
  tone = "neutral",
  weight = "regular",
  ariaLabel,
}: IconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_SIZE[size]}
      height={ICON_SIZE[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke={toneColor(tone) ?? "currentColor"}
      strokeWidth={STROKE[weight]}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon={name}
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined ? true : undefined}
      style={{ flexShrink: 0 }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
