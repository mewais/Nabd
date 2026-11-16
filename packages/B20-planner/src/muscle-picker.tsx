import { MUSCLES_ANATOMICAL, MUSCLE_NAMES } from "@nabd/domain";
import type { MuscleKey } from "@nabd/domain";
import { Button, Eyebrow, RADIUS } from "@nabd/design-system";

export interface MusclePickerProps {
  onPick: (muscle: MuscleKey) => void;
}

/** Every muscle, to add as a slot of a cycled day. */
export function MusclePicker({ onPick }: MusclePickerProps): JSX.Element {
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: RADIUS.tile, padding: 13 }}>
      <Eyebrow style={{ marginBottom: 9 }}>+ Add muscle</Eyebrow>
      <div
        role="group"
        aria-label="Add muscle"
        style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
      >
        {MUSCLES_ANATOMICAL.map((muscle) => (
          <Button key={muscle} variant="secondary" size="sm" onClick={() => onPick(muscle)}>
            {MUSCLE_NAMES[muscle]}
          </Button>
        ))}
      </div>
    </div>
  );
}
