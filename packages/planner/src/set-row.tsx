import { Badge, IconButton, Stepper, TEXT } from "@nabd/design-system";
import type { Tone } from "@nabd/design-system";
import type { PrescriptionActions } from "./actions";
import type { SetBadgeKind, SetRowVM } from "./set-block-vm";

interface SetRowProps {
  row: SetRowVM;
  /** The table's column template, shared with its header. */
  columns: string;
  /** Whether the table has a load column (a set without a value leaves it empty). */
  hasIntensityColumn: boolean;
  actions: PrescriptionActions;
}

const BADGE_TONES: Record<SetBadgeKind, Tone> = {
  warm: "neutral",
  work: "accent",
  drop: "info",
};

/** One set: its type badge, reps (or a range, or seconds), load, and a remove ×. */
export function SetRow({ row, columns, hasIntensityColumn, actions }: SetRowProps): JSX.Element {
  const { index, labels } = row;
  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap: 9, alignItems: "center" }}>
      <Badge
        tone={BADGE_TONES[row.badgeKind]}
        title={row.badgeTitle}
        onClick={() => actions.cycleSetType(index)}
      >
        {row.badgeLabel}
      </Badge>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Stepper
          size="mini"
          ariaLabel={labels.low}
          value={row.low}
          onDec={() => actions.stepRep(index, "a", -1)}
          onInc={() => actions.stepRep(index, "a", 1)}
        />
        {row.high !== null && (
          <>
            <span style={TEXT.hint}>–</span>
            <Stepper
              size="mini"
              ariaLabel={labels.high}
              value={row.high}
              onDec={() => actions.stepRep(index, "b", -1)}
              onInc={() => actions.stepRep(index, "b", 1)}
            />
          </>
        )}
      </div>
      {hasIntensityColumn &&
        (row.intensity === null ? (
          <span />
        ) : (
          <Stepper
            size="mini"
            ariaLabel={labels.intensity}
            value={row.intensity}
            onDec={() => actions.stepIntensity(index, -1)}
            onInc={() => actions.stepIntensity(index, 1)}
          />
        ))}
      <div style={{ justifySelf: "end" }}>
        <IconButton
          icon="close"
          variant="plain"
          ariaLabel={labels.remove}
          onClick={() => actions.removeSet(index)}
        />
      </div>
    </div>
  );
}
