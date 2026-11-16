import { Button, ChipGroup, Dropdown, FormSection, TextInput } from "@nabd/design-system";
import { toggled } from "@nabd/domain";
import { EQUIPMENT_OPTIONS, MUSCLE_OPTIONS, TRACKING_OPTIONS } from "../options";
import type { LibraryActions } from "./library-actions";
import type { ExerciseFormVM } from "./library-vm";

interface ExerciseFormProps {
  vm: ExerciseFormVM;
  actions: Pick<LibraryActions, "patchDraft" | "cancelDraft" | "saveDraft">;
}

/** The custom-exercise form: a name, the muscles worked, how it is tracked and what it needs. */
export function ExerciseForm({ vm, actions }: ExerciseFormProps): JSX.Element {
  const { patchDraft } = actions;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "18px 18px 20px" }}>
      <FormSection title="Exercise name">
        <TextInput
          value={vm.name}
          onChange={(name) => patchDraft({ name })}
          placeholder="Exercise name"
          ariaLabel="Exercise name"
        />
      </FormSection>
      <FormSection title="Primary muscles">
        <ChipGroup
          options={MUSCLE_OPTIONS}
          selected={vm.primary}
          onToggle={(muscle) => patchDraft({ primary: toggled(vm.primary, muscle) })}
        />
      </FormSection>
      <FormSection title="How to track it">
        <Dropdown
          ariaLabel="How to track it"
          value={vm.tracking}
          options={TRACKING_OPTIONS}
          onChange={(tracking) => patchDraft({ tracking })}
        />
      </FormSection>
      <FormSection title="Equipment">
        <Dropdown
          ariaLabel="Equipment"
          value={vm.equipment}
          options={EQUIPMENT_OPTIONS}
          onChange={(equipment) => patchDraft({ equipment })}
        />
      </FormSection>
      <FormSection title="Secondary muscles">
        <ChipGroup
          options={MUSCLE_OPTIONS}
          selected={vm.secondary}
          onToggle={(muscle) => patchDraft({ secondary: toggled(vm.secondary, muscle) })}
        />
      </FormSection>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <Button disabled={!vm.canCreate} onClick={actions.saveDraft} style={{ flex: 1 }}>
          Create
        </Button>
        <Button variant="ghost" onClick={actions.cancelDraft}>
          Back
        </Button>
      </div>
    </div>
  );
}
