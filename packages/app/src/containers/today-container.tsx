import { useMemo } from "react";
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
import { useActions, useNabd } from "../store-context";

/** The Today screen. */
export function TodayContainer(): JSX.Element {
  const store = useActions();
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

  const vm = useMemo(
    () =>
      buildTodayVM({
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
      }),
    [plan, coach, nudge, stats, unit, hasProgram, coverage, planned, mapView, mapStyle],
  );
  const actions = useMemo(
    (): TodayActions => ({
      start: store.openSession,
      snooze: store.snooze,
      logOther: () => store.openLibrary({ kind: "extra" }),
      toggleSkip: store.toggleSkip,
      setMapView: store.setMapView,
      setMapStyle: store.setMapStyle,
    }),
    [store],
  );

  return <TodayScreen vm={vm} actions={actions} />;
}
