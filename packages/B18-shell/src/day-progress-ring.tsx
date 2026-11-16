import type { CSSProperties } from "react";
import { RADIUS, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { DayProgressVM } from "./view-model";

export interface DayProgressRingProps {
  progress: DayProgressVM;
}

const RING_SIZE = 108;
const RING_WIDTH = 9;

const CENTRED: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
};

/** Today's sets as a ring that fills as they get done. */
export function DayProgressRing({ progress }: DayProgressRingProps): JSX.Element {
  const { done, totalLabel, pct } = progress;
  return (
    <div
      style={{
        ...SURFACE2_BOX,
        marginTop: "auto",
        borderRadius: RADIUS.card,
        padding: 16,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        role="img"
        aria-label={`${done} ${totalLabel} done today`}
        style={{
          ...CENTRED,
          width: RING_SIZE,
          height: RING_SIZE,
          background: `conic-gradient(var(--accent) ${pct}%, var(--line) ${pct}%)`,
        }}
      >
        <div
          style={{
            ...CENTRED,
            width: RING_SIZE - 2 * RING_WIDTH,
            height: RING_SIZE - 2 * RING_WIDTH,
            background: "var(--surface)",
            gap: 1,
          }}
        >
          <span style={{ ...TEXT.monoValue, fontSize: 26, lineHeight: 1 }}>{done}</span>
          <span style={{ fontSize: 10.5, color: "var(--text3)" }}>{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}
