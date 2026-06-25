// @nabd/bodymap — anatomical body map renderer (vendored body-muscles SVG).
// Tints each region by aggregated per-muscle coverage via MUSCLE_REGION_MAP.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { CSSProperties } from "react";
import type { Coverage, MuscleKey } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

export type MapStyle = "heat" | "outline";
export type MapView = "front" | "back";

/** Which tracking muscle a region id belongs to (reverse of MUSCLE_REGION_MAP),
 *  or null if the region is decorative (head, hands, …). */
export function regionMuscle(_regionId: string): MuscleKey | null {
  return NI();
}

/** SVG fill/stroke style for a region given coverage + style mode. */
export function regionStyle(_regionId: string, _coverage: Coverage, _style: MapStyle): CSSProperties {
  return NI();
}

export interface BodyMapProps {
  side: MapView;
  coverage: Coverage;
  style?: MapStyle; // default "heat"
  width?: number;
}
/** Render one side of the body as an SVG with tinted regions. */
export function BodyMap(_p: BodyMapProps): JSX.Element {
  return NI();
}

export interface MuscleBarProps {
  muscle: MuscleKey;
  /** 0–100. */
  pct: number;
  showRec?: boolean;
}
/** A labeled per-muscle coverage bar (with optional rest/push tag). */
export function MuscleBar(_p: MuscleBarProps): JSX.Element {
  return NI();
}
