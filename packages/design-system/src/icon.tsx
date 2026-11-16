import { ICON_PATHS } from "./icon-paths";
import type { IconName } from "./icon-paths";
import { COLOR, toneColor } from "./tokens";
import type { Tone } from "./tokens";

/** An icon's colour: a tone, the faint text colour, or white on an accent fill. */
type IconTone = Tone | "faint" | "onAccent";

interface IconProps {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  /** `neutral` (default) draws in the surrounding text colour. */
  tone?: IconTone;
  strokeWidth?: number;
  /** Accessible name. Without one the icon is decorative and hidden from assistive tech. */
  ariaLabel?: string;
}

function strokeOf(tone: IconTone): string {
  if (tone === "faint") return COLOR.textFaint;
  if (tone === "onAccent") return COLOR.onAccent;
  return toneColor(tone) ?? "currentColor";
}

/** A stroke icon from the app's set. */
export function Icon({
  name,
  size = 24,
  tone = "neutral",
  strokeWidth = 2,
  ariaLabel,
}: IconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeOf(tone)}
      strokeWidth={strokeWidth}
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
