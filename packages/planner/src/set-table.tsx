import { Button, Divider, Grid, Row, Stack, Text, TextInput } from "@nabd/design-system";
import type { GridColumns } from "@nabd/design-system";
import type { PrescriptionEdit } from "@nabd/program-editor";
import { PrescriptionControls } from "./prescription-controls";
import type { SetBlockVM } from "./set-block-vm";
import { SetRow } from "./set-row";
import { WORDS } from "./wording";

interface SetTableProps {
  vm: SetBlockVM;
  /** A change to the prescription this table shows; whose it is, the owner knows. */
  onEdit: (change: PrescriptionEdit) => void;
}

/** Badge, reps, [load], remove. */
const COLUMNS = {
  plain: ["badge", { min: "tile" }, "badge"],
  withIntensity: ["badge", { min: "tile" }, "stepper", "badge"],
} as const satisfies Record<string, GridColumns>;

/** A prescription's sets, with the controls that shape them and a note. */
export function SetTable({ vm, onEdit }: SetTableProps): JSX.Element {
  const hasIntensityColumn = vm.intensityHeader !== null;
  const columns = hasIntensityColumn ? COLUMNS.withIntensity : COLUMNS.plain;
  return (
    <Stack gap="md">
      <Stack gap="sm">
        <Grid columns={columns} gap="sm">
          <Text variant="eyebrow">{WORDS.set}</Text>
          <Text variant="eyebrow">{vm.repHeader}</Text>
          {hasIntensityColumn && <Text variant="eyebrow">{vm.intensityHeader}</Text>}
        </Grid>
        <Divider />
        {vm.rows.map((row) => (
          <SetRow
            key={row.index}
            vm={row}
            columns={columns}
            hasIntensityColumn={hasIntensityColumn}
            onEdit={onEdit}
          />
        ))}
      </Stack>
      <PrescriptionControls vm={vm} onEdit={onEdit} />
      <Row gap="lg">
        <Button variant="link" size="sm" onClick={() => onEdit((p) => p.addSet())}>
          {WORDS.addSet}
        </Button>
        <Button
          variant="link"
          size="sm"
          tone="neutral"
          onClick={() => onEdit((p) => p.addWarmup())}
        >
          {WORDS.addWarmup}
        </Button>
      </Row>
      <TextInput
        size="sm"
        ariaLabel={WORDS.note}
        placeholder={WORDS.notePlaceholder}
        value={vm.notes}
        onChange={(notes) => onEdit((p) => p.setNotes(notes))}
      />
    </Stack>
  );
}
