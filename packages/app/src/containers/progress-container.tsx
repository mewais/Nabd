import { ProgressScreen, buildProgressVM } from "@nabd/progress";
import type { ProgressActions } from "@nabd/progress";
import type { NabdActions } from "@nabd/store";
import {
  selectCoverage,
  selectExerciseProgress,
  selectPlannedVolume,
  selectStats,
} from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): ProgressActions => ({
  setTab: store.setProgressTab,
  openChart: store.openChart,
});

/** The Progress screen. */
export function ProgressContainer(): JSX.Element {
  const stats = useNabd(selectStats);
  const progress = useNabd(selectExerciseProgress);
  const coverage = useNabd(selectCoverage);
  const planned = useNabd(selectPlannedVolume);
  const today = useNabd((s) => s.dayState.date);
  const tab = useNabd((s) => s.progressTab);
  const unit = useNabd((s) => s.settings.weightUnit);
  const vm = useViewModel(buildProgressVM, {
    stats,
    progress,
    unit,
    coverage,
    planned,
    today,
    tab,
  });
  const actions = useBoundActions(bind);
  return <ProgressScreen vm={vm} actions={actions} />;
}
