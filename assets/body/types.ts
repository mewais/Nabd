// Vendored from vulovix/body-muscles (Apache-2.0). Self-contained type defs.
// See ./LICENSE and the repository NOTICE for attribution.

export enum ViewSide {
  FRONT = "front",
  BACK = "back",
}

export type MuscleId = string;

/** SVG path definition for one anatomical region. */
export interface MuscleDef {
  /** Region identifier, e.g. "shoulder-front-left", "traps-mid-right". */
  id: MuscleId;
  /** Human-readable name. */
  name: string;
  /** SVG path data for the `d` attribute. */
  path: string;
  /** Which view this region belongs to. */
  view: ViewSide;
}
