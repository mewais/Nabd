// Rendering metadata for the vendored body-muscles SVG (Apache-2.0).
// Source coordinate system: a single 72x93-ish canvas split into two halves.
// FRONT regions have x < 35; BACK regions have x > 35.

import { ViewSide } from "./types";

export const VIEWBOX: Record<ViewSide, string> = {
  [ViewSide.FRONT]: "0 0 35 93",
  [ViewSide.BACK]: "37 0 35 93",
};

// Reasonable default stroke widths in the source coordinate space (outline style).
export const STROKE_WIDTH = { rest: 0.1, emphasis: 0.3 } as const;
