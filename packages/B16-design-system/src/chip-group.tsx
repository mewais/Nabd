import type { ReactNode } from "react";
import { ChipToggle } from "./chip-toggle";

export interface ChipOption<K extends string> {
  k: K;
  label: ReactNode;
}

export interface ChipGroupProps<K extends string> {
  options: readonly ChipOption<K>[];
  /** The keys that are on: one for a filter, any number for a multi-select. */
  selected: readonly K[];
  onToggle: (k: K) => void;
  /** Names the group for assistive tech. */
  ariaLabel?: string;
}

/** A wrapping row of toggle chips over a set of keys. */
export function ChipGroup<K extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: ChipGroupProps<K>): JSX.Element {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((option) => (
        <ChipToggle
          key={option.k}
          active={selected.includes(option.k)}
          onToggle={() => onToggle(option.k)}
        >
          {option.label}
        </ChipToggle>
      ))}
    </div>
  );
}
