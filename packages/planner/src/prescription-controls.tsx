import type { Intensity, RepMode } from "@nabd/domain";
import { Segmented, Stepper } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import type { PrescriptionActions } from "./actions";
import { Labelled } from "./labelled";
import type { SetBlockVM } from "./set-block-vm";

interface PrescriptionControlsProps {
  block: SetBlockVM;
  actions: PrescriptionActions;
}

const REP_MODES: readonly SegOption<RepMode>[] = [
  { value: "range", label: "Range" },
  { value: "fixed", label: "Fixed" },
  { value: "time", label: "Time" },
];

const INTENSITIES: readonly SegOption<Intensity>[] = [
  { value: "none", label: "None" },
  { value: "rpe", label: "RPE" },
  { value: "pct", label: "%1RM" },
];

/** How the sets of a prescription are written: rep mode, load mode and rest. */
export function PrescriptionControls({ block, actions }: PrescriptionControlsProps): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <Labelled label="Reps">
        <Segmented
          size="sm"
          ariaLabel="Rep mode"
          options={REP_MODES}
          value={block.repMode}
          onChange={actions.setRepMode}
        />
      </Labelled>
      <Labelled label="Load">
        <Segmented
          size="sm"
          ariaLabel="Load mode"
          options={INTENSITIES}
          value={block.intensity}
          onChange={actions.setIntensity}
        />
      </Labelled>
      <div style={{ marginLeft: "auto" }}>
        <Labelled label="Rest">
          <Stepper
            size="mini"
            ariaLabel="Rest"
            value={block.rest}
            onDec={() => actions.stepRest(-1)}
            onInc={() => actions.stepRest(1)}
          />
        </Labelled>
      </div>
    </div>
  );
}
