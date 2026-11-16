import { Card } from "./card";
import type { CardVariant } from "./card";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
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
    <Card variant={variant} ariaLabel={label} padding="lg" grow>
      <Stack gap="sm">
        <Text variant="caption">{label}</Text>
        <Row gap="xs" align="baseline">
          <Text as="span" variant="stat" tone={tone === "neutral" ? "strong" : tone}>
            {value}
          </Text>
          {unit !== undefined && (
            <Text as="span" variant="hint">
              {unit}
            </Text>
          )}
        </Row>
      </Stack>
    </Card>
  );
}
