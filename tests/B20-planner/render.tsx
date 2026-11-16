// Renders the planner the way the app drives it: every `onEdit(edit)` is applied
// to a real ProgramEditor and the screen re-renders from the new program, so
// tests assert on the program a click produces.

import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import type { Program } from "@nabd/domain";
import { ProgramEditor } from "@nabd/program-editor";
import { PlannerScreen } from "@nabd/planner";
import type { PlannerActions } from "@nabd/planner";
import { lookup, vmOf } from "./fixtures";

export function renderPlanner(initial: Program, editDayId: string | null = null) {
  let current = initial;
  let nextId = 0;
  const newId = (): string => `new-${++nextId}`;
  const spies = {
    onSelectDay: vi.fn<PlannerActions["onSelectDay"]>(),
    onAddExercise: vi.fn<PlannerActions["onAddExercise"]>(),
    onAddToPool: vi.fn<PlannerActions["onAddToPool"]>(),
  };

  function Harness(): JSX.Element {
    const [program, setProgram] = useState(initial);
    const [selected, setSelected] = useState(editDayId);
    const actions: PlannerActions = {
      ...spies,
      onEdit: (edit) => {
        current = edit(new ProgramEditor(current, newId, lookup));
        setProgram(current);
      },
      onSelectDay: (dayId) => {
        spies.onSelectDay(dayId);
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

/** The n-th button with this accessible name on the whole screen. */
export const button = (name: string | RegExp, index = 0): HTMLElement => {
  const found = screen.getAllByRole("button", { name })[index];
  if (!found) throw new Error(`no button "${name}" at ${index}`);
  return found;
};
