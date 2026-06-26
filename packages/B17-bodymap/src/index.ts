// @nabd/bodymap — anatomical body map renderer (react-native-body-highlighter asset).
// Tints each region by averaged per-muscle coverage via MUSCLE_REGION_MAP.

/** @jsxImportSource react */
import { createElement } from "react";
import type { CSSProperties } from "react";
import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLE_REGION_MAP, MUSCLE_NAMES } from "@nabd/domain";
import { FRONT_MUSCLES, BACK_MUSCLES, VIEWBOX } from "../../../assets/body/index";

export type MapStyle = "heat" | "outline";
export type MapView = "front" | "back";

/**
 * Return the list of MuscleKeys whose MUSCLE_REGION_MAP includes `slug`.
 * Many muscles can map to one slug (e.g. front/side/rear delts → "deltoids").
 */
export function regionMuscles(slug: string): MuscleKey[] {
  const result: MuscleKey[] = [];
  for (const [muscle, slugs] of Object.entries(MUSCLE_REGION_MAP) as [MuscleKey, string[]][]) {
    if (slugs.includes(slug)) {
      result.push(muscle);
    }
  }
  return result;
}

/** SVG fill/stroke style for a slug given coverage + style mode.
 *  Average the coverage of all muscles that map to this slug.
 *  Slugs with no mapped muscle (head/hair/hands/feet/knees/ankles) → neutral.
 */
export function regionStyle(slug: string, coverage: Coverage, style: MapStyle): CSSProperties {
  const muscles = regionMuscles(slug);
  if (muscles.length === 0) {
    return { fill: "var(--map-muscle)" };
  }
  const sum = muscles.reduce((acc, m) => acc + Math.min(100, Math.max(0, coverage[m])), 0);
  const avg = sum / muscles.length;
  if (style === "heat") {
    return {
      fill: "var(--accent)",
      fillOpacity: 0.34 + 0.66 * (avg / 100),
    };
  } else {
    return {
      fill: "var(--map-muscle)",
      stroke: "var(--accent)",
      strokeOpacity: 0.2 + 0.8 * (avg / 100),
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
  const muscles = side === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  const viewBox = VIEWBOX[side];

  const svgProps: Record<string, unknown> = { viewBox, width };

  const paths: JSX.Element[] = [];
  for (const part of muscles) {
    const s = regionStyle(part.slug, coverage, style);
    const mappedMuscles = regionMuscles(part.slug);
    let titleEl: JSX.Element | null = null;
    if (mappedMuscles.length > 0) {
      const sum = mappedMuscles.reduce(
        (acc, m) => acc + Math.min(100, Math.max(0, coverage[m])),
        0
      );
      const avg = Math.round(sum / mappedMuscles.length);
      const names = mappedMuscles.map((m) => MUSCLE_NAMES[m]).join(", ");
      titleEl = createElement("title", null, `${names} · ${avg}%`);
    }

    // Render a path for each defined side-array in part.path
    const pathArrays = [
      ...(part.path.left ?? []),
      ...(part.path.right ?? []),
      ...(part.path.center ?? []),
      ...(part.path.common ?? []),
    ];

    for (let i = 0; i < pathArrays.length; i++) {
      const d = pathArrays[i];
      const key = `${part.slug}-${i}`;
      paths.push(
        createElement(
          "path",
          { key, d, style: s },
          // Only attach title to the first path of a mapped region
          i === 0 && titleEl !== null ? titleEl : null
        )
      );
    }
  }

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
