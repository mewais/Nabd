import type { ReactNode } from "react";
import type { Direction } from "@nabd/domain";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import type { Size } from "./tokens";
import { stepLabel } from "./wording";

/** `md` for forms; `sm` for dense table rows. */
export type StepperSize = Extract<Size, "sm" | "md">;

interface StepperFrameProps {
  /** − was pressed (-1), or + (+1). */
  onStep: (direction: Direction) => void;
  size: StepperSize;
  /** What is stepped, as it reads after "Decrease" and "Increase": names the two buttons. */
  name: string;
  /** Name the group too, when the value inside does not carry the name itself. */
  namesGroup?: boolean;
  /** The value between the two buttons. */
  children: ReactNode;
}

/** The "− … +" around a stepper's value, each button named for what it steps ("Decrease reps"). */
export function StepperFrame(props: StepperFrameProps): JSX.Element {
  const { onStep, size, name, namesGroup = false, children } = props;
  const button = size === "sm" ? "inset" : "raised";
  return (
    <Row role="group" ariaLabel={namesGroup ? name : undefined} gap={size === "sm" ? "xs" : "md"}>
      <IconButton
        variant={button}
        size={size}
        icon="minus"
        ariaLabel={stepLabel(-1, name)}
        onClick={() => onStep(-1)}
      />
      {children}
      <IconButton
        variant={button}
        size={size}
        icon="plus"
        ariaLabel={stepLabel(1, name)}
        onClick={() => onStep(1)}
      />
    </Row>
  );
}
