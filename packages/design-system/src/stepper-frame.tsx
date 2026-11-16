import type { ReactNode } from "react";
import type { Direction } from "@nabd/domain";
import { IconButton } from "./icon-button";
import { Row } from "./row";

/** `large` for forms; `mini` for dense table rows. */
export type StepperSize = "mini" | "large";

interface StepperFrameProps {
  /** − was pressed (-1), or + (+1). */
  onStep: (direction: Direction) => void;
  size: StepperSize;
  /** Names the group, when the value inside does not carry the name itself. */
  groupLabel?: string | undefined;
  /** The value between the two buttons. */
  children: ReactNode;
}

/** The "− … +" around a stepper's value. */
export function StepperFrame(props: StepperFrameProps): JSX.Element {
  const { onStep, size, groupLabel, children } = props;
  const button = size === "mini" ? "mini" : "raised";
  return (
    <Row role="group" ariaLabel={groupLabel} gap={size === "mini" ? "xs" : "md"}>
      <IconButton variant={button} icon="minus" ariaLabel="decrease" onClick={() => onStep(-1)} />
      {children}
      <IconButton variant={button} icon="plus" ariaLabel="increase" onClick={() => onStep(1)} />
    </Row>
  );
}
