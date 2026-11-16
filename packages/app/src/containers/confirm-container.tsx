import { useMemo } from "react";
import type { Program } from "@nabd/domain";
import type { ExerciseLibrary } from "@nabd/dataset";
import { ConfirmModal, buildConfirmVM } from "@nabd/modals";
import type { ConfirmActions, ConfirmSubject } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import type { Confirmation } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** What `confirmation` is about, by the names the user gave things. */
function subjectOf(
  confirmation: Confirmation,
  program: Program,
  library: ExerciseLibrary,
): ConfirmSubject {
  switch (confirmation.kind) {
    case "import":
      return { kind: "import" };
    case "deleteDay": {
      const day = program.days.find((d) => d.id === confirmation.dayId);
      return { kind: "deleteDay", name: day?.name ?? "this day" };
    }
    case "deleteExercise":
      return {
        kind: "deleteExercise",
        name: library.byId(confirmation.exId)?.name ?? "this exercise",
      };
  }
}

/** The confirmation of a destructive action, while one is being asked. */
export function ConfirmContainer(): JSX.Element | null {
  const store = useActions();
  const confirmation = useNabd((s) => s.confirmation);
  const program = useNabd((s) => s.program);
  const library = useNabd(selectLibrary);

  const vm = useMemo(
    () => confirmation && buildConfirmVM(subjectOf(confirmation, program, library)),
    [confirmation, program, library],
  );
  const actions = useMemo(
    (): ConfirmActions => ({
      confirm: () => void store.answer(true),
      cancel: () => void store.answer(false),
    }),
    [store],
  );

  return vm && <ConfirmModal vm={vm} actions={actions} />;
}
