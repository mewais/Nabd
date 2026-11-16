import type { SetType } from "@nabd/domain";
import { Badge, IconButton, Stepper, TEXT } from "@nabd/design-system";
import type { Tone } from "@nabd/design-system";
import type { PrescriptionEdit } from "@nabd/program-editor";
import type { SetRowVM } from "./set-block-vm";

interface SetRowProps {
  vm: SetRowVM;
  /** The table's column template, shared with its header. */
  columns: string;
  /** Whether the table has a load column (a set without a value leaves it empty). */
  hasIntensityColumn: boolean;
  onEdit: (change: PrescriptionEdit) => void;
}

const BADGE_TONES: Record<SetType, Tone> = {
  warmup: "neutral",
  working: "accent",
  drop: "info",
};

/** One set: its type badge, reps (or a range, or seconds), load, and a remove ×. */
export function SetRow({ vm, columns, hasIntensityColumn, onEdit }: SetRowProps): JSX.Element {
  const { index, labels } = vm;
  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap: 9, alignItems: "center" }}>
      <Badge
        tone={BADGE_TONES[vm.type]}
        title={vm.badgeTitle}
        onClick={() => onEdit((p) => p.cycleSetType(index))}
      >
        {vm.badge}
      </Badge>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Stepper
          size="mini"
          ariaLabel={labels.amount}
          value={vm.amount}
          onStep={(direction) => onEdit((p) => p.stepAmount(index, direction))}
        />
        {vm.upTo !== null && (
          <>
            <span style={TEXT.hint}>–</span>
            <Stepper
              size="mini"
              ariaLabel={labels.upTo}
              value={vm.upTo}
              onStep={(direction) => onEdit((p) => p.stepUpTo(index, direction))}
            />
          </>
        )}
      </div>
      {hasIntensityColumn &&
        (vm.intensity === null ? (
          <span />
        ) : (
          <Stepper
            size="mini"
            ariaLabel={labels.intensity}
            value={vm.intensity}
            onStep={(direction) => onEdit((p) => p.stepIntensity(index, direction))}
          />
        ))}
      <div style={{ justifySelf: "end" }}>
        <IconButton
          icon="close"
          variant="plain"
          ariaLabel={labels.remove}
          onClick={() => onEdit((p) => p.removeSet(index))}
        />
      </div>
    </div>
  );
}
