import { COMMON_WORDS, Row, Segmented, Spacer, Stepper } from "@nabd/design-system";
import type { PrescriptionEdit } from "@nabd/program-editor";
import { Labelled } from "./labelled";
import { INTENSITY_OPTIONS, REP_STYLE_OPTIONS } from "./options";
import type { SetBlockVM } from "./set-block-vm";
import { WORDS } from "./wording";

interface PrescriptionControlsProps {
  vm: SetBlockVM;
  onEdit: (change: PrescriptionEdit) => void;
}

/** How the sets of a prescription are written: rep style (where there is a choice), load mode and rest. */
export function PrescriptionControls({ vm, onEdit }: PrescriptionControlsProps): JSX.Element {
  return (
    <Row gap="lg" wrap>
      {vm.repStyle !== null && (
        <Labelled label={COMMON_WORDS.reps}>
          <Segmented
            size="sm"
            ariaLabel={WORDS.repMode}
            options={REP_STYLE_OPTIONS}
            value={vm.repStyle}
            onChange={(style) => onEdit((p) => p.setRepStyle(style))}
          />
        </Labelled>
      )}
      <Labelled label={WORDS.load}>
        <Segmented
          size="sm"
          ariaLabel={WORDS.loadMode}
          options={INTENSITY_OPTIONS}
          value={vm.intensity}
          onChange={(mode) => onEdit((p) => p.setIntensity(mode))}
        />
      </Labelled>
      <Spacer />
      <Labelled label={WORDS.rest}>
        <Stepper
          size="sm"
          ariaLabel={WORDS.rest}
          value={vm.rest}
          onStep={(direction) => onEdit((p) => p.stepRest(direction))}
        />
      </Labelled>
    </Row>
  );
}
