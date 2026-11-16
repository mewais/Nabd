// Renders the planner the way the app drives it: every `edit(...)` is applied
// to a real ProgramEditor and the screen re-renders from the new program, so
// tests assert on the program a click produces.

import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import { lookup, vmOf } from "./fixtures";
import { ProgramEditor } from "@nabd/program-editor";
import { PlannerScreen } from "@nabd/planner";
import type { PlannerActions } from "@nabd/planner";
import type { Program } from "@nabd/domain";
import type { PlanToday } from "@nabd/program-editor";

/** The planner is used on a Monday, on which the plan is on its first day. */
const TODAY: PlanToday = { weekday: 1, dayId: null };

/** `plannerDayId`: the day the editor opens on; like the app, the harness always has one (the first, unless told). */
export function renderPlanner(
  initial: Program,
  plannerDayId: string | null = initial.days[0]?.id ?? null,
) {
  let current = initial;
  let nextId = 0;
  const newId = (): string => `new-${++nextId}`;
  const spies = {
    selectDay: vi.fn<PlannerActions["selectDay"]>(),
    removeDay: vi.fn<PlannerActions["removeDay"]>(),
    addExercise: vi.fn<PlannerActions["addExercise"]>(),
    addPoolExercise: vi.fn<PlannerActions["addPoolExercise"]>(),
  };

  function Harness(): JSX.Element {
    const [program, setProgram] = useState(initial);
    const [selected, setSelected] = useState(plannerDayId);
    const actions: PlannerActions = {
      ...spies,
      edit: (edit) => {
        current = edit(new ProgramEditor(current, newId, lookup, TODAY));
        setProgram(current);
      },
      selectDay: (dayId) => {
        spies.selectDay(dayId);
        setSelected(dayId);
      },
    };
    return <PlannerScreen vm={vmOf(program, selected)} actions={actions} />;
  }

  render(<Harness />);
  return {
    ...spies,
    /** The program after every edit so far. */
    program: (): Program => current,
  };
}

/** Queries scoped to one exercise card (by exercise name) or slot card (by muscle name). */
export const card = (name: string) => within(screen.getByRole("region", { name }));

/** Queries scoped to one "− value +" stepper, by what it steps. */
export const stepper = (scope: ReturnType<typeof within>, name: string) =>
  within(scope.getByRole("group", { name }));

/** The n-th option (a radio of a radio group) with this accessible name on the whole screen. */
export const radio = (name: string | RegExp, index = 0): HTMLElement => {
  const found = screen.getAllByRole("radio", { name })[index];
  if (!found) throw new Error(`no option "${name}" at ${index}`);
  return found;
};

/** The n-th button with this accessible name on the whole screen. */
export const button = (name: string | RegExp, index = 0): HTMLElement => {
  const found = screen.getAllByRole("button", { name })[index];
  if (!found) throw new Error(`no button "${name}" at ${index}`);
  return found;
};
