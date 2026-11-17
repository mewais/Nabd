// Nothing logged is lost quietly: a logged set waits in `unsavedSets` from the
// moment it is logged until the backend has it, and is tried again for as long
// as the backend will not take it (see Persistence.flushSets).

import type { StoreCore } from "./context";
import { errorText } from "./state";
import type { Notify, Persistence, Try } from "./persistence";

/** The logged sets not saved yet: saved in the order they were logged, and tried again until they are. */
export function setSaver(
  { set, get, client }: StoreCore,
  notify: Notify,
  attempt: Try,
): Pick<Persistence, "flushSets" | "retrySets"> {
  const stopWaiting = (setId: string): void =>
    set((s) => ({ unsavedSets: s.unsavedSets.filter((id) => id !== setId) }));

  /** Saving failed, and no pass has saved everything since: the user has been told once. */
  let failing = false;

  /**
   * One pass over the waiting sets, oldest first, stopping at the first that
   * cannot be saved. A set undone while it waited is simply forgotten; one
   * undone while it was being saved is taken back out of the backend.
   */
  async function saveWaitingSets(): Promise<boolean> {
    let saved = 0;
    for (const setId of get().unsavedSets) {
      const waiting = get().history.find((logged) => logged.id === setId);
      if (waiting) {
        try {
          await client.appendSet(waiting);
        } catch (e) {
          if (!failing) {
            notify(
              "error",
              `Could not save that set: ${errorText(e)}. ` +
                "It is kept, marked as not saved yet, and will be saved as soon as that works again.",
            );
          }
          failing = true;
          return false;
        }
      }
      const undone = !get().history.some((logged) => logged.id === setId);
      stopWaiting(setId);
      if (waiting && undone) await attempt("undo that set", () => client.deleteSet(setId));
      else if (waiting) saved += 1;
    }
    if (failing && saved > 0) notify("info", "The sets that were waiting are saved now.");
    failing = false;
    return true;
  }

  let flushing: Promise<boolean> | null = null;
  /** One pass at a time; a set logged while a pass ran gets a pass of its own. */
  const flushSets = async (): Promise<boolean> => {
    flushing ??= saveWaitingSets().finally(() => {
      flushing = null;
    });
    const allSaved = await flushing;
    return allSaved && get().unsavedSets.length > 0 ? flushSets() : allSaved;
  };

  const retrySets = (): void => {
    if (get().unsavedSets.length > 0) void flushSets();
  };

  return { flushSets, retrySets };
}
