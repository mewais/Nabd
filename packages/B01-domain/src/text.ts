/** A count with its noun, pluralised with a plain "s": "1 set", "3 sets", "0 sets". */
export function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
