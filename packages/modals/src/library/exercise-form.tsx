import {
  Button,
  ChipGroup,
  Dropdown,
  FormSection,
  Row,
  Stack,
  TextInput,
} from "@nabd/design-system";
import { EQUIPMENT_OPTIONS, TRACKING_OPTIONS } from "../options";
import type { LibraryActions } from "./library-actions";
import type { ExerciseFormVM } from "./library-vm";
import { WORDS } from "../wording";

interface ExerciseFormProps {
  vm: ExerciseFormVM;
  actions: Pick<LibraryActions, "patchDraft" | "cancelDraft" | "saveDraft">;
}

/** The custom-exercise form: a name, the muscles worked, how it is tracked and what it needs. */
export function ExerciseForm({ vm, actions }: ExerciseFormProps): JSX.Element {
  const { patchDraft } = actions;
  return (
    <Stack gap="lg" padding="xl">
      <FormSection title={WORDS.exerciseName}>
        <TextInput
          value={vm.name}
          onChange={(name) => patchDraft({ name })}
          placeholder={WORDS.exerciseName}
          ariaLabel={WORDS.exerciseName}
        />
      </FormSection>
      <FormSection title={WORDS.primaryMuscles}>
        <ChipGroup
          options={vm.primary.chips}
          selected={vm.primary.selected}
          onToggle={(chip) => patchDraft(chip.toggle)}
        />
      </FormSection>
      <FormSection title={WORDS.tracking}>
        <Dropdown
          ariaLabel={WORDS.tracking}
          value={vm.tracking}
          options={TRACKING_OPTIONS}
          onChange={(tracking) => patchDraft({ tracking })}
        />
      </FormSection>
      <FormSection title={WORDS.equipment}>
        <Dropdown
          ariaLabel={WORDS.equipment}
          value={vm.equipment}
          options={EQUIPMENT_OPTIONS}
          onChange={(equipment) => patchDraft({ equipment })}
        />
      </FormSection>
      <FormSection title={WORDS.secondaryMuscles}>
        <ChipGroup
          options={vm.secondary.chips}
          selected={vm.secondary.selected}
          onToggle={(chip) => patchDraft(chip.toggle)}
        />
      </FormSection>
      <Row gap="sm">
        <Button disabled={!vm.canCreate} onClick={actions.saveDraft} grow>
          {WORDS.create}
        </Button>
        <Button variant="ghost" onClick={actions.cancelDraft}>
          {WORDS.back}
        </Button>
      </Row>
    </Stack>
  );
}
