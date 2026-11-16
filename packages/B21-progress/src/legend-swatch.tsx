import { RADIUS } from "@nabd/design-system";

/** The small colour square of a chart legend. */
export function LegendSwatch({ color, size = 11 }: { color: string; size?: number }): JSX.Element {
  return (
    <span
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        borderRadius: RADIUS.bar,
        background: color,
      }}
    />
  );
}
