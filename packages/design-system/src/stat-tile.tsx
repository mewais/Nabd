import { Card } from "./card";
import type { CardVariant } from "./card";
import { TEXT, toneColor } from "./tokens";
import type { Tone } from "./tokens";

/** One headline figure, as a view-model lists it. */
export interface StatFigure {
  /** What the figure counts. */
  label: string;
  /** The figure, already formatted. */
  value: string;
  /** What it is counted in, shown small after the figure. */
  unit?: string;
  /** Colours the figure. */
  tone?: Tone;
}

interface StatTileProps extends StatFigure {
  /** `card` on the page, `inset` inside a card or a modal. */
  variant?: Extract<CardVariant, "card" | "inset">;
}

/** One headline figure with its label. Tiles in a row share the width evenly. */
export function StatTile({
  label,
  value,
  unit,
  tone = "neutral",
  variant = "card",
}: StatTileProps): JSX.Element {
  return (
    <Card variant={variant} ariaLabel={label} padding={16} style={{ flex: 1, minWidth: 0 }}>
      <div style={TEXT.cardSubtitle}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 6 }}>
        <span
          style={{
            ...TEXT.monoValue,
            fontSize: 24,
            letterSpacing: "-0.02em",
            color: toneColor(tone) ?? "var(--text)",
          }}
        >
          {value}
        </span>
        {unit !== undefined && <span style={TEXT.hint}>{unit}</span>}
      </div>
    </Card>
  );
}
