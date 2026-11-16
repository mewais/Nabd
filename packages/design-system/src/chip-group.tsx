import { ChipToggle } from "./chip-toggle";
import type { Option } from "./option";

interface ChipGroupProps<V extends string> {
  options: readonly Option<V>[];
  /** The values that are on: one for a filter, any number for a multi-select. */
  selected: readonly V[];
  onToggle: (value: V) => void;
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

/** A wrapping row of toggle chips over a set of values. */
export function ChipGroup<V extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: ChipGroupProps<V>): JSX.Element {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((option) => (
        <ChipToggle
          key={option.value}
          active={selected.includes(option.value)}
          onToggle={() => onToggle(option.value)}
        >
          {option.label}
        </ChipToggle>
      ))}
    </div>
  );
}
