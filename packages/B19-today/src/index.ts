// @nabd/today — the Today screen: what to do next, today's queue, muscle
// coverage and a few stats. Pure view-model builders + presentational React.

import React from "react";
import type { CSSProperties } from "react";
import type { Coverage } from "@nabd/domain";
import type { MapStyle } from "@nabd/bodymap";
import { CoverageCard, type CoverageView } from "./coverage-card";
import { HeroCard } from "./hero-card";
import { VolumeInsightCard } from "./insight-card";
import { QueueCard } from "./queue-card";
import { StatTiles } from "./stat-tiles";
import type { TodayVM } from "./view-model";

export { buildTodayVM } from "./view-model";
export type { TodayVM, HeroVM, QueueRowVM } from "./view-model";
export { HeroCard } from "./hero-card";
export { QueueCard } from "./queue-card";
export { CoverageCard } from "./coverage-card";
export type { CoverageView } from "./coverage-card";
export { VolumeInsightCard } from "./insight-card";
export { StatTiles } from "./stat-tiles";

export interface TodayScreenProps {
  vm: TodayVM;
  coverage: Coverage;
  mapView: CoverageView;
  mapStyle: MapStyle;
  /** Muscle display names worth resting / pushing. */
  insightRest: string[];
  insightPush: string[];
  /** Start the next due set, or a specific exercise. */
  onStart: (itemId?: string) => void;
  onSnooze: () => void;
  onLogOther: () => void;
  onToggleSkip: (itemId: string) => void;
  onMapView: (v: CoverageView) => void;
  onMapStyle: (s: MapStyle) => void;
}

const COLUMN: CSSProperties = { display: "flex", flexDirection: "column", gap: 18, minWidth: 0 };

export function TodayScreen(p: TodayScreenProps): JSX.Element {
  const { vm } = p;
  return React.createElement(
    "div",
    { style: { flex: 1, overflow: "auto", padding: 26 } },
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)",
          gap: 20,
          maxWidth: 1240,
          margin: "0 auto",
          alignItems: "start",
        },
      },
      React.createElement(
        "div",
        { style: COLUMN },
        React.createElement(HeroCard, {
          vm: vm.hero,
          onStart: () => p.onStart(),
          onSnooze: p.onSnooze,
          onLogOther: p.onLogOther,
        }),
        vm.queue.length > 0
          ? React.createElement(QueueCard, {
              dayName: vm.dayName,
              rows: vm.queue,
              onStart: p.onStart,
              onToggleSkip: p.onToggleSkip,
            })
          : null,
      ),
      React.createElement(
        "div",
        { style: COLUMN },
        React.createElement(CoverageCard, {
          coverage: p.coverage,
          mapView: p.mapView,
          mapStyle: p.mapStyle,
          onMapView: p.onMapView,
          onMapStyle: p.onMapStyle,
        }),
        React.createElement(VolumeInsightCard, { rest: p.insightRest, push: p.insightPush }),
        React.createElement(StatTiles, vm.stats),
      ),
    ),
  );
}
