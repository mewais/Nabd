import type { ReactNode } from "react";
import { COLOR, RADIUS, SURFACE2_BOX } from "./tokens";

export interface SegOption<K extends string = string> {
  k: K;
  label: ReactNode;
  /** Accessible name, when the label alone is not enough (e.g. an initial). */
  ariaLabel?: string;
  /** Tooltip. */
  title?: string;
  /** Shown but not selectable; say why in `title`. */
  disabled?: boolean;
}

export interface SegmentedProps<K extends string = string> {
  options: readonly SegOption<K>[];
  value: K;
  onChange: (k: K) => void;
  size?: "sm" | "md";
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

const SIZES = {
  sm: { padding: "5px 9px", fontSize: 11.5, radius: 7 },
  md: { padding: "6px 12px", fontSize: 12.5, radius: RADIUS.chip },
} as const;

/** A row of mutually exclusive options; the chosen one is filled. */
export function Segmented<K extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedProps<K>): JSX.Element {
  const { padding, fontSize, radius } = SIZES[size];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        ...SURFACE2_BOX,
        display: "inline-flex",
        borderRadius: radius + 2,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const active = option.k === value;
        return (
          <button
            key={option.k}
            type="button"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            title={option.title}
            disabled={option.disabled}
            onClick={() => onChange(option.k)}
            style={{
              padding,
              fontSize,
              borderRadius: radius,
              border: "none",
              cursor: option.disabled ? "not-allowed" : "pointer",
              opacity: option.disabled ? 0.5 : 1,
              fontFamily: "inherit",
              fontWeight: 600,
              background: active ? "var(--accent)" : "transparent",
              color: active ? COLOR.onAccent : "var(--text2)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
