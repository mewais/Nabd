import { ChartModal, buildChartVM } from "@nabd/modals";
import type { ChartActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { selectExerciseProgress } from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): ChartActions => ({ close: store.closeChart });

/** The full-history chart of an exercise, while one is picked. */
export function ChartContainer(): JSX.Element | null {
  const exId = useNabd((s) => s.chartExercise);
  const progress = useNabd(selectExerciseProgress);
  const unit = useNabd((s) => s.settings.weightUnit);
  const vm = useViewModel(
    (input) => (input.exId === null ? null : buildChartVM(input.progress, input.exId, input.unit)),
    { exId, progress, unit },
  );
  const actions = useBoundActions(bind);
  return vm && <ChartModal vm={vm} actions={actions} />;
}
