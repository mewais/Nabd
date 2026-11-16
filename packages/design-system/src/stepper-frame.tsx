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
  /** What is stepped, as it reads after "Decrease" and "Increase": names the two buttons. */
  name: string;
  /** Name the group too, when the value inside does not carry the name itself. */
  namesGroup?: boolean;
  /** The value between the two buttons. */
  children: ReactNode;
}

/** "reps" for "Reps", "set 1 RPE" for "Set 1 RPE": a name as it reads inside a phrase. */
const inPhrase = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

/** The "− … +" around a stepper's value, each button named for what it steps ("Decrease reps"). */
export function StepperFrame(props: StepperFrameProps): JSX.Element {
  const { onStep, size, name, namesGroup = false, children } = props;
  const button = size === "mini" ? "mini" : "raised";
  return (
    <Row role="group" ariaLabel={namesGroup ? name : undefined} gap={size === "mini" ? "xs" : "md"}>
      <IconButton
        variant={button}
        icon="minus"
        ariaLabel={`Decrease ${inPhrase(name)}`}
        onClick={() => onStep(-1)}
      />
      {children}
      <IconButton
        variant={button}
        icon="plus"
        ariaLabel={`Increase ${inPhrase(name)}`}
        onClick={() => onStep(1)}
      />
    </Row>
  );
}
