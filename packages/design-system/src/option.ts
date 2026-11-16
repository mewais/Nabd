/** One choice of a control that picks among values: what it stands for and what it says. */
export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** `keys` as the options of a picker, each labelled with its name. */
export function optionsOf<V extends string>(
  keys: readonly V[],
  names: Readonly<Record<V, string>>,
): Option<V>[] {
  return keys.map((value) => ({ value, label: names[value] }));
}
