import type { CSSProperties } from "react";
import { ALIGN, JUSTIFY, boxStyle } from "./layout";
import type { Align, BoxProps, Justify } from "./layout";
import { SPACE } from "./tokens";
import type { Space } from "./tokens";

export interface FlexProps extends BoxProps {
  /** The space between children, a step of the spacing scale. */
  gap?: Space;
  /** Across the direction of the flow. */
  align?: Align;
  /** Along the direction of the flow. */
  justify?: Justify;
  /** Children that do not fit go on to the next line. */
  wrap?: boolean;
}

interface FlexBoxProps extends FlexProps {
  direction: "row" | "column";
}

/** What Row and Stack are made of. */
export function Flex({ direction, ...props }: FlexBoxProps): JSX.Element {
  const { as: Tag = "div", gap = "none", align, justify, wrap = false } = props;
  const style: CSSProperties = {
    ...boxStyle(props),
    display: "flex",
    flexDirection: direction,
    gap: SPACE[gap],
    alignItems: align && ALIGN[align],
    justifyContent: justify && JUSTIFY[justify],
    flexWrap: wrap ? "wrap" : undefined,
  };
  return (
    <Tag role={props.role} aria-label={props.ariaLabel} style={style}>
      {props.children}
    </Tag>
  );
}
