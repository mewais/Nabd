/** What a picker's options stand for: a key of a name table, or a number such as a weekday. */
export type OptionValue = string | number;

/** One choice of a control that picks among values: what it stands for and what it says. */
export interface Option<V extends OptionValue = string> {
  value: V;
  label: string;
}

/** `keys` as the options of a picker, each labelled with its name: from a name table, or a naming function. */
export function optionsOf<V extends OptionValue>(
  keys: readonly V[],
  names: Readonly<Record<V, string>> | ((key: V) => string),
): Option<V>[] {
  return keys.map((value) => ({
    value,
    label: typeof names === "function" ? names(value) : names[value],
  }));
}
