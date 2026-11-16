import { useMemo } from "react";
import { ProgressScreen, buildProgressVM } from "@nabd/progress";
import type { ProgressActions } from "@nabd/progress";
import {
  selectCoverage,
  selectExerciseProgress,
  selectPlannedVolume,
  selectStats,
} from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The Progress screen. */
export function ProgressContainer(): JSX.Element {
  const store = useActions();
  const stats = useNabd(selectStats);
  const progress = useNabd(selectExerciseProgress);
  const coverage = useNabd(selectCoverage);
  const planned = useNabd(selectPlannedVolume);
  const today = useNabd((s) => s.dayState.date);
  const tab = useNabd((s) => s.progressTab);
  const unit = useNabd((s) => s.settings.weightUnit);

  const vm = useMemo(
    () => buildProgressVM({ stats, progress, unit, coverage, planned, today, tab }),
    [stats, progress, unit, coverage, planned, today, tab],
  );
  const actions = useMemo(
    (): ProgressActions => ({ setTab: store.setProgressTab, openChart: store.openChart }),
    [store],
  );

  return <ProgressScreen vm={vm} actions={actions} />;
}
