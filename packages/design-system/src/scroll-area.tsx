import { boxStyle } from "./layout";
import type { BoxProps } from "./layout";

/** A pane that scrolls on its own when its content is taller than the room it has. */
export function ScrollArea(props: BoxProps): JSX.Element {
  const { as: Tag = "div" } = props;
  return (
    <Tag
      role={props.role}
      aria-label={props.ariaLabel}
      style={{ ...boxStyle(props), minHeight: 0, overflowY: "auto", scrollbarWidth: "thin" }}
    >
      {props.children}
    </Tag>
  );
}
