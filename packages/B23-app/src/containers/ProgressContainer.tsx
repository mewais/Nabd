import { useMemo } from "react";
import { parseDateKey } from "@nabd/domain";
import { exerciseTrends } from "@nabd/progression";
import type { ExerciseTrend } from "@nabd/progression";
import { FullHistoryChartModal, buildChartVM } from "@nabd/modals";
import { ProgressScreen, buildProgressVM } from "@nabd/progress";
import { selectCoverage, selectLibrary, selectStats } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

export function ProgressContainer(): JSX.Element {
  const actions = useActions();
  const history = useNabd((s) => s.history);
  const unit = useNabd((s) => s.settings.weightUnit);
  const stats = useNabd(selectStats);
  const coverage = useNabd(selectCoverage);
  const library = useNabd(selectLibrary);
  const tab = useNabd((s) => s.progressTab);
  const chartExercise = useNabd((s) => s.chartExercise);
  // The clock only matters here to the day.
  const today = useNabd((s) => s.dayState.date);
  const now = useMemo(() => parseDateKey(today), [today]);

  const trends = useMemo(
    () => exerciseTrends(history, unit, (exId) => library.byId(exId)?.tracking),
    [history, unit, library],
  );
  // A deleted custom exercise still has history: fall back to its logged name.
  const exerciseName = useMemo(() => {
    const logged = new Map(history.map((set) => [set.exId, set.exercise]));
    return (exId: string): string => library.byId(exId)?.name ?? logged.get(exId) ?? exId;
  }, [history, library]);
  const vm = useMemo(
    () => buildProgressVM({ stats, trends, exerciseName, now }),
    [stats, trends, exerciseName, now],
  );
  const charted: ExerciseTrend | undefined = trends.find((t) => t.exId === chartExercise);

  return (
    <>
      <ProgressScreen
        vm={vm}
        coverage={coverage}
        tab={tab}
        onTab={actions.setProgressTab}
        onOpenChart={actions.setChartExercise}
      />
      {charted && (
        <FullHistoryChartModal
          vm={buildChartVM(exerciseName(charted.exId), charted)}
          onClose={() => actions.setChartExercise(null)}
        />
      )}
    </>
  );
}
