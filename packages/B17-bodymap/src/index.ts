// @nabd/bodymap — anatomical body map renderer (vendored body-muscles SVG).
// Tints each region by aggregated per-muscle coverage via MUSCLE_REGION_MAP.

/** @jsxImportSource react */
import { createElement } from "react";
import type { CSSProperties } from "react";
import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLE_REGION_MAP, MUSCLE_NAMES } from "@nabd/domain";
import { FRONT_MUSCLES, BACK_MUSCLES, ViewSide, VIEWBOX } from "../../../assets/body/index";

export type MapStyle = "heat" | "outline";
export type MapView = "front" | "back";

/** Which tracking muscle a region id belongs to (reverse of MUSCLE_REGION_MAP),
 *  or null if the region is decorative (head, hands, …). */
export function regionMuscle(regionId: string): MuscleKey | null {
  for (const [muscle, prefixes] of Object.entries(MUSCLE_REGION_MAP) as [MuscleKey, string[]][]) {
    for (const prefix of prefixes) {
      if (regionId === prefix || regionId.startsWith(prefix + "-")) {
        return muscle;
      }
    }
  }
  return null;
}

/** SVG fill/stroke style for a region given coverage + style mode. */
export function regionStyle(regionId: string, coverage: Coverage, style: MapStyle): CSSProperties {
  const muscle = regionMuscle(regionId);
  if (muscle === null) {
    return { fill: "var(--map-muscle)" };
  }
  const c = Math.min(100, Math.max(0, coverage[muscle]));
  if (style === "heat") {
    return {
      fill: "var(--accent)",
      fillOpacity: 0.34 + 0.66 * (c / 100),
    };
  } else {
    return {
      fill: "var(--map-muscle)",
      stroke: "var(--accent)",
      strokeOpacity: 0.2 + 0.8 * (c / 100),
    };
  }
}

export interface BodyMapProps {
  side: MapView;
  coverage: Coverage;
  style?: MapStyle; // default "heat"
  width?: number;
}

/** Render one side of the body as an SVG with tinted regions. */
export function BodyMap(p: BodyMapProps): JSX.Element {
  const { side, coverage, style = "heat", width = 124 } = p;
  const viewSide = side === "front" ? ViewSide.FRONT : ViewSide.BACK;
  const muscles = side === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  const viewBox = VIEWBOX[viewSide];

  const svgProps: Record<string, unknown> = { viewBox, width };

  const paths = muscles.map((region) => {
    const s = regionStyle(region.id, coverage, style);
    const muscle = regionMuscle(region.id);
    const titleText =
      muscle !== null
        ? `${MUSCLE_NAMES[muscle]} · ${Math.round(Math.min(100, Math.max(0, coverage[muscle])))}%`
        : null;

    return createElement(
      "path",
      { key: region.id, d: region.path, style: s },
      titleText !== null ? createElement("title", null, titleText) : null
    );
  });

  return createElement("svg", svgProps, ...paths);
}

export interface MuscleBarProps {
  muscle: MuscleKey;
  /** 0–100. */
  pct: number;
  showRec?: boolean;
}

/** A labeled per-muscle coverage bar (with optional rest/push tag). */
export function MuscleBar(p: MuscleBarProps): JSX.Element {
  const { muscle, pct, showRec } = p;
  const name = MUSCLE_NAMES[muscle];
  const rounded = Math.round(pct);

  let recLabel = "";
  let recColor = "var(--text3)";
  if (pct >= 66) {
    recLabel = "Rest";
    recColor = "var(--accent3)";
  } else if (pct <= 38) {
    recLabel = "Push";
    recColor = "var(--accent)";
  }

  const recTag = showRec
    ? createElement(
        "span",
        {
          className: "rec-tag",
          style: {
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontFamily: "monospace",
            width: "38px",
            textAlign: "right",
            flex: "none",
            color: recColor,
          },
        },
        recLabel
      )
    : null;

  return createElement(
    "div",
    {
      className: "muscle-bar",
      style: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "5px 0",
      },
    },
    createElement(
      "span",
      {
        className: "muscle-name",
        style: {
          width: "74px",
          flex: "none",
          fontSize: "12.5px",
          color: "var(--text)",
        },
      },
      name
    ),
    createElement(
      "div",
      {
        className: "bar-track",
        style: {
          flex: 1,
          height: "6px",
          borderRadius: "3px",
          background: "var(--surface2)",
          position: "relative",
          overflow: "hidden",
        },
      },
      createElement("div", {
        className: "bar-fill",
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          borderRadius: "3px",
          background: "var(--accent)",
          width: `${rounded}%`,
          transition: "width .5s",
        },
      })
    ),
    createElement(
      "span",
      {
        className: "pct-text",
        style: {
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "var(--text2)",
          width: "32px",
          textAlign: "right",
          flex: "none",
        },
      },
      `${rounded}%`
    ),
    recTag
  );
}
