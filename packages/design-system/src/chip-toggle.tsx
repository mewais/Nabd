import type { ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLOR, FONT_SIZE, RADIUS, SPACE, tint } from "./tokens";

interface ChipToggleProps {
  active: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/** A chip that is on or off (a filter, a muscle, a piece of equipment). */
export function ChipToggle({ active, onToggle, children }: ChipToggleProps): JSX.Element {
  return (
    <ButtonBase
      aria-pressed={active}
      onClick={onToggle}
      style={{
        fontSize: FONT_SIZE.small,
        fontWeight: active ? 700 : 500,
        padding: `${SPACE.xs}px ${SPACE.md}px`,
        borderRadius: RADIUS.chip,
        border: `1px solid ${active ? COLOR.accent : COLOR.line}`,
        background: active ? tint(COLOR.accent, "soft") : COLOR.surfaceAlt,
        color: active ? COLOR.accent : COLOR.textMuted,
      }}
    >
      {children}
    </ButtonBase>
  );
}
