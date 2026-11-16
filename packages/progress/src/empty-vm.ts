/** A section with nothing to show yet says why instead. */
export interface EmptyVM {
  empty: string;
}

/** The section that says, in `text`, why it has nothing to show yet. */
export const buildEmptyVM = (text: string): EmptyVM => ({ empty: text });

export function isEmpty<Section extends object>(section: Section | EmptyVM): section is EmptyVM {
  return "empty" in section;
}
