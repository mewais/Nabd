/** A section with nothing to show yet says why instead. */
export interface EmptyVM {
  empty: string;
}

export function isEmpty<Section extends object>(section: Section | EmptyVM): section is EmptyVM {
  return "empty" in section;
}

/** The opening of every "nothing yet" note about logged sets. */
export const NO_SETS = "No sets logged yet.";
