import type { ReactNode } from "react";
import { CENTERED } from "./styles";
import { COLOR, RADIUS, TEXT, shade } from "./tokens";

/** How much there is of something, as a step of a four-step heat scale. */
export type HeatLevel = "none" | "low" | "mid" | "high";

interface HeatCellProps {
  /** Null leaves the cell blank: it keeps its place in the grid and shows nothing. */
  level: HeatLevel | null;
  /** `cell` (default) fills its grid column and holds a label; `key` is a legend's small square. */
  variant?: "cell" | "key";
  /** A short label, such as the day of the month. */
  children?: ReactNode;
}

const FILL: Record<HeatLevel, { background: string; color: string }> = {
  none: { background: COLOR.surfaceAlt, color: COLOR.textFaint },
  low: { background: shade(COLOR.accent, "low"), color: COLOR.textMuted },
  mid: { background: shade(COLOR.accent, "mid"), color: COLOR.textMuted },
  /* The surface colour reads on the accent in both themes. */
  high: { background: COLOR.accent, color: COLOR.surface },
};

const CELL_HEIGHT = 30;
const KEY_SIZE = 12;

/** One cell of a heat map: the stronger its level, the closer to the accent. */
export function HeatCell({ level, variant = "cell", children }: HeatCellProps): JSX.Element {
  const box =
    variant === "cell"
      ? { height: CELL_HEIGHT, borderRadius: RADIUS.chip }
      : { width: KEY_SIZE, height: KEY_SIZE, borderRadius: RADIUS.bar };
  return (
    <span
      data-heat={level ?? undefined}
      style={{
        ...TEXT.monoCaption,
        ...CENTERED,
        ...box,
        ...(level === null ? { visibility: "hidden" } : FILL[level]),
        userSelect: "none",
      }}
    >
      {level === null ? null : children}
    </span>
  );
}
