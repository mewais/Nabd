import type { CSSProperties } from "react";
import { FONT } from "@nabd/design-system";

/** A card whose content is stacked, so its last block can sit at the bottom. */
export const STACKED_CARD: CSSProperties = { display: "flex", flexDirection: "column" };

/** The mono line that says what a chart or grid shows. */
export const CHART_CAPTION: CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: 12,
  color: "var(--text3)",
};
