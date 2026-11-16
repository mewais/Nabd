import type { ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { pad } from "./styles";
import { COLOR, FONT_WEIGHT, RADIUS, TEXT, tint } from "./tokens";

interface ChipToggleProps {
  on: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/** A chip that is on or off (a filter, a muscle, a piece of equipment): one of a `ChipGroup`. */
export function ChipToggle({ on, onToggle, children }: ChipToggleProps): JSX.Element {
  return (
    <ButtonBase
      aria-pressed={on}
      onClick={onToggle}
      style={{
        ...TEXT.controlSm,
        fontWeight: on ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
        padding: pad("xs", "md"),
        borderRadius: RADIUS.chip,
        border: `1px solid ${on ? COLOR.accent : COLOR.line}`,
        background: on ? tint(COLOR.accent, "soft") : COLOR.surfaceAlt,
        color: on ? COLOR.accent : COLOR.textMuted,
      }}
    >
      {children}
    </ButtonBase>
  );
}
