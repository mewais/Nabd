import { useMemo } from "react";
import { FullHistoryChartModal, buildChartVM } from "@nabd/modals";
import { ExerciseProgress, ProgressScreen, buildProgressVM } from "@nabd/progress";
import { selectCoverage, selectLibrary, selectStats } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

export function ProgressContainer(): JSX.Element {
  const actions = useActions();
  const history = useNabd((s) => s.history);
  const unit = useNabd((s) => s.settings.weightUnit);
  const library = useNabd(selectLibrary);
  const stats = useNabd(selectStats);
  const coverage = useNabd(selectCoverage);
  const today = useNabd((s) => s.dayState.date);
  const tab = useNabd((s) => s.progressTab);
  const chartExercise = useNabd((s) => s.chartExercise);

  const progress = useMemo(
    () => new ExerciseProgress(history, library, unit),
    [history, library, unit],
  );
  const vm = useMemo(
    () => buildProgressVM({ stats, progress, coverage, today }),
    [stats, progress, coverage, today],
  );
  const charted = chartExercise === null ? undefined : progress.trendOf(chartExercise);

  return (
    <>
      <ProgressScreen vm={vm} tab={tab} actions={actions} />
      {charted && (
        <FullHistoryChartModal
          vm={buildChartVM(progress.nameOf(charted.exId), charted)}
          onClose={() => actions.setChartExercise(null)}
        />
      )}
    </>
  );
}
