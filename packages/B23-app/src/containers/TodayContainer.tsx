import { useMemo } from "react";
import { MUSCLE_NAMES } from "@nabd/domain";
import { insight } from "@nabd/coverage";
import {
  selectCoach,
  selectCoverage,
  selectNudgeStatus,
  selectPlannedVolume,
  selectStats,
  selectTodayPlan,
} from "@nabd/store";
import { TodayScreen, buildTodayVM } from "@nabd/today";
import { useActions, useNabd } from "../store-context";

export function TodayContainer(): JSX.Element {
  const actions = useActions();
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
    () => buildTodayVM({ plan, coach, nudge, stats, unit, hasProgram }),
    [plan, coach, nudge, stats, unit, hasProgram],
  );
  const { rest, push } = useMemo(() => insight(coverage, planned), [coverage, planned]);

  return (
    <TodayScreen
      vm={vm}
      coverage={coverage}
      mapView={mapView}
      mapStyle={mapStyle}
      insightRest={rest.map((m) => MUSCLE_NAMES[m])}
      insightPush={push.map((m) => MUSCLE_NAMES[m])}
      onStart={actions.openSession}
      onSnooze={actions.snooze}
      onLogOther={() => actions.openLibrary({ kind: "extra" })}
      onToggleSkip={actions.toggleSkip}
      onMapView={actions.setMapView}
      onMapStyle={actions.setMapStyle}
    />
  );
}
