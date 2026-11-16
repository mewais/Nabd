import { Row, Segmented, Stack, Text, TitleInput } from "@nabd/design-system";
import { PROGRAM_TYPE_OPTIONS, scheduleOptions } from "./options";
import type { PlannerActions } from "./planner-actions";
import type { HeaderVM } from "./planner-vm";
import { WORDS } from "./wording";

interface ProgramHeaderProps {
  vm: HeaderVM;
  actions: Pick<PlannerActions, "edit">;
}

/** The program's name, and the two choices that shape it: plan type and schedule. */
export function ProgramHeader({ vm, actions }: ProgramHeaderProps): JSX.Element {
  const { edit } = actions;
  return (
    <Row gap="lg" wrap>
      <Stack gap="xxs">
        <Text variant="eyebrow">{WORDS.program}</Text>
        <TitleInput
          ariaLabel={WORDS.programName}
          value={vm.name}
          onChange={(name) => edit((e) => e.rename(name))}
        />
      </Stack>
      <Segmented
        ariaLabel={WORDS.planType}
        options={PROGRAM_TYPE_OPTIONS}
        value={vm.type}
        onChange={(type) => edit((e) => e.setType(type))}
      />
      <Segmented
        ariaLabel={WORDS.schedule}
        options={scheduleOptions(vm.weekdayBlocked)}
        value={vm.schedule}
        onChange={(schedule) => edit((e) => e.setSchedule(schedule))}
      />
    </Row>
  );
}
