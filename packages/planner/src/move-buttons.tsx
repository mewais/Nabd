import { IconButton } from "@nabd/design-system";

interface MoveButtonsProps {
  /** Earlier (-1) or later (+1). */
  onMove: (direction: number) => void;
  /** Arrows point left/right (a row of things) instead of up/down (a list). */
  horizontal?: boolean;
}

/** A pair of arrows that move something one place earlier or later. */
export function MoveButtons({ onMove, horizontal = false }: MoveButtonsProps): JSX.Element {
  return (
    <div style={{ display: "inline-flex", gap: 3, flex: "none" }}>
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
    </div>
  );
}
