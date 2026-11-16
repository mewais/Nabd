import { ButtonBase } from "./button-base";
import type { Option } from "./option";
import { COLOR, FONT_SIZE, QUIET_BOX, RADIUS, SPACE } from "./tokens";

export interface SegOption<V extends string = string> extends Option<V> {
  /** Accessible name, when the label alone is not enough (e.g. an initial). */
  ariaLabel?: string;
  /** Tooltip. */
  title?: string;
  /** Shown but not selectable; say why in `title`. */
  disabled?: boolean;
}

interface SegmentedProps<V extends string = string> {
  options: readonly SegOption<V>[];
  value: V;
  onChange: (value: V) => void;
  size?: "sm" | "md";
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

const SIZES = {
  sm: { padding: `${SPACE.xs}px ${SPACE.sm}px`, fontSize: FONT_SIZE.tiny, radius: RADIUS.tag },
  md: { padding: `${SPACE.xs}px ${SPACE.md}px`, fontSize: FONT_SIZE.small, radius: RADIUS.chip },
} as const;

/** A row of mutually exclusive options; the chosen one is filled. */
export function Segmented<V extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedProps<V>): JSX.Element {
  const { padding, fontSize, radius } = SIZES[size];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        ...QUIET_BOX,
        display: "inline-flex",
        flex: "none",
        borderRadius: radius + SPACE.xxs,
        padding: SPACE.xxs,
        gap: SPACE.xxs,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ButtonBase
            key={option.value}
            aria-pressed={active}
            aria-label={option.ariaLabel}
            title={option.title}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            style={{
              padding,
              fontSize,
              lineHeight: 1.5,
              borderRadius: radius,
              fontWeight: 600,
              background: active ? COLOR.accent : COLOR.none,
              color: active ? COLOR.onAccent : COLOR.textMuted,
            }}
          >
            {option.label}
          </ButtonBase>
        );
      })}
    </div>
  );
}
