import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import type { Option } from "./option";
import { COLOR, FONT_SIZE, QUIET_BOX, RADIUS, SPACE } from "./tokens";
import { rovingTarget } from "./roving";

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

/**
 * A row of mutually exclusive options; the chosen one is filled. To the
 * keyboard it is one radio group, a single tab stop: the arrow keys (and Home
 * and End) move to another option and choose it, skipping disabled ones.
 */
export function Segmented<V extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedProps<V>): JSX.Element {
  const { padding, fontSize, radius } = SIZES[size];
  const group = useRef<HTMLDivElement>(null);
  const enabled = options.map((option) => !option.disabled);
  const chosen = options.findIndex((option) => option.value === value);
  // The tab stop: the chosen option, else the first that can be chosen.
  const tabStop = chosen !== -1 && enabled[chosen] ? chosen : enabled.indexOf(true);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const from = Math.max(0, chosen);
    const target = rovingTarget(event.key, from, enabled);
    const option = target === null ? undefined : options[target];
    if (target === null || option === undefined) return;
    event.preventDefault();
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[target]?.focus();
    if (target !== chosen) onChange(option.value);
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{
        ...QUIET_BOX,
        display: "inline-flex",
        flex: "none",
        borderRadius: radius + SPACE.xxs,
        padding: SPACE.xxs,
        gap: SPACE.xxs,
      }}
    >
      {options.map((option, index) => {
        const active = index === chosen;
        return (
          <ButtonBase
            key={option.value}
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel}
            title={option.title}
            disabled={option.disabled}
            tabIndex={index === tabStop ? 0 : -1}
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
