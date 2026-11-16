// Nothing logged is lost quietly: a set the backend would not take waits in
// `unsavedSets` and is tried again until it is saved (see Persistence.saveSet).

import type { LoggedSet } from "@nabd/domain";
import type { StoreCore } from "./context";
import { errorText } from "./state";
import type { Notify, Persistence, Try } from "./persistence";

/** The logged sets: saved at once, or kept waiting and tried again (see `saveSet`). */
export function setSaver(
  { set, get, client }: StoreCore,
  notify: Notify,
  attempt: Try,
): Pick<Persistence, "saveSet" | "flushSets"> & { retry: () => void } {
  const stopWaiting = (setId: string): void =>
    set((s) => ({ unsavedSets: s.unsavedSets.filter((id) => id !== setId) }));

  /**
   * One pass over the waiting sets, oldest first, stopping at the first that
   * still cannot be saved. A set undone while it waited is simply forgotten;
   * one undone while it was being saved is taken back out of the backend.
   */
  async function saveWaitingSets(): Promise<boolean> {
    let saved = 0;
    for (const setId of get().unsavedSets) {
      const waiting = get().history.find((logged) => logged.id === setId);
      if (waiting) {
        try {
          await client.appendSet(waiting);
        } catch {
          return false;
        }
      }
      const undone = !get().history.some((logged) => logged.id === setId);
      stopWaiting(setId);
      if (waiting && undone) await attempt("undo that set", () => client.deleteSet(setId));
      else if (waiting) saved += 1;
    }
    if (saved > 0) notify("info", "The sets that were waiting are saved now.");
    return true;
  }

  let flushing: Promise<boolean> | null = null;
  const flushSets = (): Promise<boolean> => {
    flushing ??= saveWaitingSets().finally(() => {
      flushing = null;
    });
    return flushing;
  };

  /** A good moment to try the waiting sets again, if there are any. */
  const retry = (): void => {
    if (get().unsavedSets.length > 0) void flushSets();
  };

  const saveSet = async (logged: LoggedSet): Promise<void> => {
    try {
      await client.appendSet(logged);
    } catch (e) {
      set((s) => ({ unsavedSets: [...s.unsavedSets, logged.id] }));
      notify(
        "error",
        `Could not save that set: ${errorText(e)}. ` +
          "It is kept, marked as not saved yet, and will be saved as soon as that works again.",
      );
      return;
    }
    retry();
  };

  return { saveSet, flushSets, retry };
}
