import { ChipToggle } from "./chip-toggle";
import type { Option, OptionValue } from "./option";
import { Row } from "./row";

interface ChipGroupProps<O extends Option<OptionValue>> {
  options: readonly O[];
  /** The values that are on: one for a filter, any number for a multi-select. */
  selected: readonly O["value"][];
  /** A chip was pressed: the option it stands for, so a view-model's option can carry what that does. */
  onToggle: (option: O) => void;
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

/** A wrapping row of toggle chips over a set of values. */
export function ChipGroup<O extends Option<OptionValue>>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: ChipGroupProps<O>): JSX.Element {
  return (
    <Row role="group" ariaLabel={ariaLabel} gap="sm" wrap>
      {options.map((option) => (
        <ChipToggle
          key={option.value}
          on={selected.includes(option.value)}
          onToggle={() => onToggle(option)}
        >
          {option.label}
        </ChipToggle>
      ))}
    </Row>
  );
}
