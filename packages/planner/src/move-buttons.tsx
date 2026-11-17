import type { Direction } from "@nabd/domain";
import { IconButton, Row } from "@nabd/design-system";
import { WORDS } from "./wording";

interface MoveButtonsProps {
  /** Earlier (-1) or later (+1). */
  onMove: (direction: Direction) => void;
  /** Arrows point left/right (a row of things) instead of up/down (a list). */
  horizontal?: boolean;
}

/** A pair of arrows that move something one place earlier or later. */
export function MoveButtons({ onMove, horizontal = false }: MoveButtonsProps): JSX.Element {
  return (
    <Row gap="xs">
      <IconButton
        size="sm"
        icon={horizontal ? "chevron-left" : "chevron-up"}
        ariaLabel={WORDS.moveEarlier}
        onClick={() => onMove(-1)}
      />
      <IconButton
        size="sm"
        icon={horizontal ? "chevron-right" : "chevron-down"}
        ariaLabel={WORDS.moveLater}
        onClick={() => onMove(1)}
      />
    </Row>
  );
}
