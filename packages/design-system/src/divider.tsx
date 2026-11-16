import { COLOR } from "./tokens";

interface DividerProps {
  /** A short upright rule between things in a Row, instead of a line across a Stack. */
  vertical?: boolean;
}

const VERTICAL_HEIGHT = 14;

/** A hairline between two blocks. */
export function Divider({ vertical = false }: DividerProps): JSX.Element {
  return (
    <span
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      style={{
        display: "block",
        flex: "none",
        background: COLOR.line,
        ...(vertical ? { width: 1, height: VERTICAL_HEIGHT } : { height: 1, alignSelf: "stretch" }),
      }}
    />
  );
}
