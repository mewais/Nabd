import { Button, Eyebrow, TextInput } from "@nabd/design-system";
import type { PrescriptionActions } from "./actions";
import { PrescriptionControls } from "./prescription-controls";
import type { SetBlockVM } from "./set-block-vm";
import { SetRow } from "./set-row";

interface SetTableProps {
  block: SetBlockVM;
  actions: PrescriptionActions;
}

/** Badge, reps, [load], remove. */
const COLUMNS = {
  plain: "30px minmax(150px,1fr) 26px",
  withIntensity: "30px minmax(150px,1fr) 96px 26px",
};

/** A prescription's sets, with the controls that shape them and a note. */
export function SetTable({ block, actions }: SetTableProps): JSX.Element {
  const hasIntensityColumn = block.intensityHeader !== null;
  const columns = hasIntensityColumn ? COLUMNS.withIntensity : COLUMNS.plain;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 13 }}>
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            gap: 9,
            padding: "0 2px 7px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Eyebrow>Set</Eyebrow>
          <Eyebrow>{block.repHeader}</Eyebrow>
          {hasIntensityColumn && <Eyebrow>{block.intensityHeader}</Eyebrow>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {block.rows.map((row) => (
            <SetRow
              key={row.index}
              row={row}
              columns={columns}
              hasIntensityColumn={hasIntensityColumn}
              actions={actions}
            />
          ))}
        </div>
      </div>
      <PrescriptionControls block={block} actions={actions} />
      <div style={{ display: "flex", gap: 16 }}>
        <Button variant="link" size="sm" onClick={actions.addSet}>
          + Add set
        </Button>
        <Button variant="link" size="sm" tone="neutral" onClick={actions.addWarmup}>
          + Warmup
        </Button>
      </div>
      <TextInput
        size="sm"
        ariaLabel="Note"
        placeholder="Add a note (cues, setup, tempo…)"
        value={block.notes}
        onChange={actions.setNotes}
      />
    </div>
  );
}
