import type { NabdActions } from "@nabd/store";
import {
  selectCoach,
  selectCoverage,
  selectNudgeStatus,
  selectPlannedVolume,
  selectStats,
  selectTodayPlan,
} from "@nabd/store";
import { TodayScreen, buildTodayVM } from "@nabd/today";
import type { TodayActions } from "@nabd/today";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): TodayActions => ({
  start: store.openSession,
  snooze: store.snooze,
  logOther: () => store.openLibrary({ kind: "extra" }),
  toggleSkip: store.toggleSkip,
  setMapView: store.setMapView,
  setMapStyle: store.setMapStyle,
});

/** The Today screen. */
export function TodayContainer(): JSX.Element {
  const plan = useNabd(selectTodayPlan);
  const coach = useNabd(selectCoach);
  const nudge = useNabd(selectNudgeStatus);
  const stats = useNabd(selectStats);
  const coverage = useNabd(selectCoverage);
  const planned = useNabd(selectPlannedVolume);
  const unit = useNabd((s) => s.settings.weightUnit);
  const hasProgram = useNabd((s) => s.program.days.length > 0);
  const mapView = useNabd((s) => s.mapView);
  const mapStyle = useNabd((s) => s.mapStyle);
  const vm = useViewModel(buildTodayVM, {
    plan,
    coach,
    nudge,
    stats,
    unit,
    hasProgram,
    coverage,
    planned,
    mapView,
    mapStyle,
  });
  const actions = useBoundActions(bind);
  return <TodayScreen vm={vm} actions={actions} />;
}
