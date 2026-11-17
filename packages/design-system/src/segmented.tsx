import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { ButtonBase } from "./button-base";
import type { Option, OptionValue } from "./option";
import { rovingTarget } from "./roving";
import { pad } from "./styles";
import { COLOR, FONT_WEIGHT, QUIET_BOX, RADIUS, SPACE, TEXT } from "./tokens";
import type { Size } from "./tokens";

export interface SegOption<V extends OptionValue = string> extends Option<V> {
  /** Accessible name, when the label alone is not enough (e.g. an initial). */
  ariaLabel?: string;
  /** Tooltip. */
  title?: string;
  /** Shown but not selectable; say why in `title`. */
  disabled?: boolean;
}

type SegmentedSize = Extract<Size, "sm" | "md">;

interface SegmentedProps<V extends OptionValue = string> {
  options: readonly SegOption<V>[];
  /** The chosen option's value; null while none is chosen. */
  value: V | null;
  onChange: (value: V) => void;
  size?: SegmentedSize;
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

const SIZES = {
  sm: { padding: pad("xs", "sm"), text: TEXT.controlXs, radius: RADIUS.tag },
  md: { padding: pad("xs", "md"), text: TEXT.controlSm, radius: RADIUS.chip },
} as const satisfies Record<SegmentedSize, object>;

/**
 * A row of mutually exclusive options; the chosen one is filled. To the
 * keyboard it is one radio group, a single tab stop: the arrow keys (and Home
 * and End) move to another option and choose it, skipping disabled ones.
 */
export function Segmented<V extends OptionValue = string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: SegmentedProps<V>): JSX.Element {
  const { padding, text, radius } = SIZES[size];
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
        const selected = index === chosen;
        return (
          <ButtonBase
            key={option.value}
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            title={option.title}
            disabled={option.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => onChange(option.value)}
            style={{
              ...text,
              padding,
              lineHeight: 1.5,
              borderRadius: radius,
              fontWeight: FONT_WEIGHT.semibold,
              background: selected ? COLOR.accent : COLOR.none,
              color: selected ? COLOR.onAccent : COLOR.textMuted,
            }}
          >
            {option.label}
          </ButtonBase>
        );
      })}
    </div>
  );
}
