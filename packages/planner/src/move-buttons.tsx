import type { Direction } from "@nabd/domain";
import { IconButton, Row } from "@nabd/design-system";

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
        variant="mini"
        icon={horizontal ? "chevron-left" : "chevron-up"}
        ariaLabel="Move earlier"
        onClick={() => onMove(-1)}
      />
      <IconButton
        variant="mini"
        icon={horizontal ? "chevron-right" : "chevron-down"}
        ariaLabel="Move later"
        onClick={() => onMove(1)}
      />
    </Row>
  );
}
