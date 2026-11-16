/** A count with its noun, pluralised with a plain "s": "1 set", "3 sets", "0 sets". */
export function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** "M:SS" for a duration in whole seconds: "1:30", "0:45". */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
