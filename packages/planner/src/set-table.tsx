import { Button, Eyebrow, TextInput } from "@nabd/design-system";
import type { PrescriptionEdit } from "@nabd/program-editor";
import { PrescriptionControls } from "./prescription-controls";
import type { SetBlockVM } from "./set-block-vm";
import { SetRow } from "./set-row";

interface SetTableProps {
  vm: SetBlockVM;
  /** A change to the prescription this table shows; whose it is, the owner knows. */
  onEdit: (change: PrescriptionEdit) => void;
}

/** Badge, reps, [load], remove. */
const COLUMNS = {
  plain: "30px minmax(150px,1fr) 26px",
  withIntensity: "30px minmax(150px,1fr) 96px 26px",
};

/** A prescription's sets, with the controls that shape them and a note. */
export function SetTable({ vm, onEdit }: SetTableProps): JSX.Element {
  const hasIntensityColumn = vm.intensityHeader !== null;
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
          <Eyebrow>{vm.repHeader}</Eyebrow>
          {hasIntensityColumn && <Eyebrow>{vm.intensityHeader}</Eyebrow>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {vm.rows.map((row) => (
            <SetRow
              key={row.index}
              vm={row}
              columns={columns}
              hasIntensityColumn={hasIntensityColumn}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
      <PrescriptionControls vm={vm} onEdit={onEdit} />
      <div style={{ display: "flex", gap: 16 }}>
        <Button variant="link" size="sm" onClick={() => onEdit((p) => p.addSet())}>
          + Add set
        </Button>
        <Button
          variant="link"
          size="sm"
          tone="neutral"
          onClick={() => onEdit((p) => p.addWarmup())}
        >
          + Warmup
        </Button>
      </div>
      <TextInput
        size="sm"
        ariaLabel="Note"
        placeholder="Add a note (cues, setup, tempo…)"
        value={vm.notes}
        onChange={(notes) => onEdit((p) => p.setNotes(notes))}
      />
    </div>
  );
}
