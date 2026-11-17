// The Today screen's pickers: what each one offers.

import type { SegOption } from "@nabd/design-system";
import type { MapStyle, MapView } from "@nabd/view";

export const MAP_VIEW_OPTIONS: readonly SegOption<MapView>[] = [
  { value: "both", label: "Both" },
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
];

export const MAP_STYLE_OPTIONS: readonly SegOption<MapStyle>[] = [
  { value: "heat", label: "Heat" },
  { value: "outline", label: "Outline" },
];
