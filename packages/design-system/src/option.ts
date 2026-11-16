/** One choice of a control that picks among values: what it stands for and what it says. */
export interface Option<V extends string = string> {
  value: V;
  label: string;
}
