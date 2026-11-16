import { ICON_PATHS } from "./icon-paths";
import type { IconName } from "./icon-paths";

interface IconProps {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  /** Accessible name. Without one the icon is decorative and hidden from assistive tech. */
  ariaLabel?: string;
}

/** A stroke icon from the app's set. */
export function Icon({
  name,
  size = 24,
  stroke = "currentColor",
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
      stroke={stroke}
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
