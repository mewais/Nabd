import { Card, TEXT } from "@nabd/design-system";
import type { StatTileVM } from "./view-model";

/** The day's headline figures, side by side. */
export function StatTiles({ tiles }: { tiles: StatTileVM[] }): JSX.Element {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {tiles.map((tile) => (
        <Card key={tile.label} padding={15}>
          <div style={{ ...TEXT.monoValue, fontSize: 24, letterSpacing: "-0.02em" }}>
            {tile.value}
          </div>
          <div style={{ ...TEXT.cardSubtitle, marginTop: 3 }}>{tile.label}</div>
        </Card>
      ))}
    </div>
  );
}
