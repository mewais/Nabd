import { useMemo } from "react";
import { ChartModal, buildChartVM } from "@nabd/modals";
import type { ChartActions } from "@nabd/modals";
import { selectExerciseProgress } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The full-history chart of an exercise, while one is picked. */
export function ChartContainer(): JSX.Element | null {
  const store = useActions();
  const exId = useNabd((s) => s.chartExercise);
  const progress = useNabd(selectExerciseProgress);
  const unit = useNabd((s) => s.settings.weightUnit);

  const vm = useMemo(
    () => (exId === null ? null : buildChartVM(progress, exId, unit)),
    [exId, progress, unit],
  );
  const actions = useMemo((): ChartActions => ({ close: store.closeChart }), [store]);

  return vm && <ChartModal vm={vm} actions={actions} />;
}
