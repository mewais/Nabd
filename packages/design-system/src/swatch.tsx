import { RADIUS } from "./tokens";

interface SwatchProps {
  /** Any CSS colour. */
  color: string;
  /** `dot` marks a row's state; `square` keys a chart's legend. */
  shape?: "dot" | "square";
  /** Width and height in px. */
  size?: number;
}

/** A small patch of colour. */
export function Swatch({ color, shape = "dot", size = 8 }: SwatchProps): JSX.Element {
  return (
    <span
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        borderRadius: shape === "dot" ? RADIUS.round : RADIUS.bar,
        background: color,
      }}
    />
  );
}
