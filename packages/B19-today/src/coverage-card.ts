import React from "react";
import { recommendation } from "@nabd/coverage";
import type { Coverage, MuscleKey } from "@nabd/domain";
import type { MapStyle } from "@nabd/bodymap";
import { BodyMap, MuscleBar } from "@nabd/bodymap";
import { Segmented, Card } from "@nabd/design-system";
import { CARD_STYLE, MONO } from "./styles";

/** Which side(s) of the body the coverage map shows. */
export type CoverageView = "both" | "front" | "back";

/** Muscles in the order the legend lists them (shoulders → back → core → arms → legs). */
const LEGEND_MUSCLES: MuscleKey[] = [
  // Shoulders
  "front_delts",
  "side_delts",
  "rear_delts",
  // Back
  "upper_traps",
  "rhomboids",
  "lower_traps",
  "lats",
  "lower_back",
  // Chest & Core
  "chest",
  "abs",
  "obliques",
  // Arms
  "biceps",
  "triceps",
  "forearms",
  // Legs
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "hip_flexors",
  "calves",
  "tibialis",
  // Neck
  "neck",
];

export interface CoverageCardProps {
  coverage: Coverage;
  mapView: CoverageView;
  mapStyle: MapStyle;
  onMapView: (v: CoverageView) => void;
  onMapStyle: (s: MapStyle) => void;
}

export function CoverageCard(p: CoverageCardProps): JSX.Element {
  const { coverage, mapView, mapStyle, onMapView, onMapStyle } = p;

  const viewOptions = [
    { k: "both", label: "Both" },
    { k: "front", label: "Front" },
    { k: "back", label: "Back" },
  ];

  const styleOptions = [
    { k: "heat", label: "Heat" },
    { k: "outline", label: "Outline" },
  ];

  const showFront = mapView !== "back";
  const showBack = mapView !== "front";

  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: "18px 18px 14px",
      },
    },
    // card title row
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" } },
        "Muscle coverage",
      ),
      React.createElement(
        "div",
        { style: { ...MONO, fontSize: 11, color: "var(--text3)" } },
        "7-DAY",
      ),
    ),
    // segmented controls row — Segmented renders its own surface2 container
    React.createElement(
      "div",
      { style: { display: "flex", gap: 6, marginBottom: 6 } },
      React.createElement(Segmented, {
        options: viewOptions,
        value: mapView,
        onChange: (v) => onMapView(v as CoverageView),
        size: "sm",
      }),
      React.createElement(Segmented, {
        options: styleOptions,
        value: mapStyle,
        onChange: (s) => onMapStyle(s as MapStyle),
        size: "sm",
      }),
    ),
    // body map(s)
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          gap: 14,
          padding: "10px 0 6px",
        },
      },
      showFront
        ? React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  ...MONO,
                  fontSize: 10.5,
                  color: "var(--text3)",
                  letterSpacing: "0.08em",
                },
              },
              "FRONT",
            ),
            React.createElement(BodyMap, { side: "front", coverage, mapStyle }),
          )
        : null,
      showBack
        ? React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  ...MONO,
                  fontSize: 10.5,
                  color: "var(--text3)",
                  letterSpacing: "0.08em",
                },
              },
              "BACK",
            ),
            React.createElement(BodyMap, { side: "back", coverage, mapStyle }),
          )
        : null,
    ),
    // muscle legend bars
    React.createElement(
      "div",
      {
        style: {
          borderTop: "1px solid var(--line)",
          paddingTop: 10,
          marginTop: 4,
        },
      },
      ...LEGEND_MUSCLES.map((muscle) =>
        React.createElement(MuscleBar, {
          key: muscle,
          muscle,
          pct: coverage[muscle],
          recommendation: recommendation(coverage[muscle]),
        }),
      ),
    ),
  );
}
