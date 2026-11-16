import { Row, Segmented, Spacer, Stepper } from "@nabd/design-system";
import type { PrescriptionEdit } from "@nabd/program-editor";
import { Labelled } from "./labelled";
import { INTENSITY_OPTIONS, REP_STYLE_OPTIONS } from "./options";
import type { SetBlockVM } from "./set-block-vm";

interface PrescriptionControlsProps {
  vm: SetBlockVM;
  onEdit: (change: PrescriptionEdit) => void;
}

/** How the sets of a prescription are written: rep style (where there is a choice), load mode and rest. */
export function PrescriptionControls({ vm, onEdit }: PrescriptionControlsProps): JSX.Element {
  return (
    <Row gap="lg" wrap>
      {vm.repStyle !== null && (
        <Labelled label="Reps">
          <Segmented
            size="sm"
            ariaLabel="Rep mode"
            options={REP_STYLE_OPTIONS}
            value={vm.repStyle}
            onChange={(style) => onEdit((p) => p.setRepStyle(style))}
          />
        </Labelled>
      )}
      <Labelled label="Load">
        <Segmented
          size="sm"
          ariaLabel="Load mode"
          options={INTENSITY_OPTIONS}
          value={vm.intensity}
          onChange={(mode) => onEdit((p) => p.setIntensity(mode))}
        />
      </Labelled>
      <Spacer />
      <Labelled label="Rest">
        <Stepper
          size="sm"
          ariaLabel="Rest"
          value={vm.rest}
          onStep={(direction) => onEdit((p) => p.stepRest(direction))}
        />
      </Labelled>
    </Row>
  );
}
