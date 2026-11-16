import type { LoggedSet } from "@nabd/domain";
import type { Singletons } from "@nabd/ipc-client";
import type { StoreCore } from "./context";
import { STORED_NAMES } from "./hydration";
import type { LoadProblem } from "./state";

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The store's one path to the backend for anything that can fail. */
export interface Persistence {
  /**
   * Run a backend call. A failure never throws into the UI: it becomes the
   * app-level notice ("Could not <what>: …"). Resolves to whether the call worked.
   */
  attempt: (what: string, call: () => Promise<unknown>) => Promise<boolean>;
  /** Update one persisted singleton in state and in the backend. */
  save: <K extends keyof Singletons>(key: K, value: Singletons[K]) => void;
  /** Write a singleton to the backend, if it may be written. */
  persist: <K extends keyof Singletons>(key: K, value: Singletons[K]) => void;
  /** Write several singletons as one transaction (those that may be written). */
  persistTogether: (what: string, values: Partial<Singletons>) => void;
  /**
   * Save a logged set. One the backend does not accept is not lost: it waits
   * in `unsavedSets` and is tried again — on every clock beat, after any
   * backend call that works, and before an export or quitting.
   */
  saveSet: (logged: LoggedSet) => Promise<void>;
  /** Try to save the sets that are waiting; resolves to whether none is left waiting. */
  flushSets: () => Promise<boolean>;
}

export function createPersistence({ set, get, client }: StoreCore): Persistence {
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
    if (saved > 0) {
      set({ appNotice: { kind: "info", text: "The sets that were waiting are saved now." } });
    }
    return true;
  }

  let flushing: Promise<boolean> | null = null;
  const flushSets: Persistence["flushSets"] = () => {
    flushing ??= saveWaitingSets().finally(() => {
      flushing = null;
    });
    return flushing;
  };

  /** The backend just answered: a good moment to try the waiting sets again. */
  const backendWorked = (): void => {
    if (get().unsavedSets.length > 0) void flushSets();
  };

  const attempt: Persistence["attempt"] = async (what, call) => {
    try {
      await call();
    } catch (e) {
      set({ appNotice: { kind: "error", text: `Could not ${what}: ${errorText(e)}` } });
      return false;
    }
    backendWorked();
    return true;
  };

  /** Not if its stored copy could not be read: that copy must not be overwritten (see LoadProblem). */
  function writable(key: string): boolean {
    const unreadable = (p: LoadProblem): boolean => p.source === key || p.source === "everything";
    return !get().loadProblems.some(unreadable);
  }

  const persist: Persistence["persist"] = (key, value) => {
    if (writable(key)) void attempt(`save ${STORED_NAMES[key]}`, () => client.save(key, value));
  };

  return {
    attempt,
    persist,
    flushSets,
    save: (key, value) => {
      set((state) => ({ ...state, [key]: value }));
      persist(key, value);
    },
    persistTogether: (what, values) => {
      const entries = Object.entries(values).filter(([key]) => writable(key));
      if (entries.length === 0) return;
      void attempt(`save ${what}`, () => client.saveMany(Object.fromEntries(entries)));
    },
    saveSet: async (logged) => {
      try {
        await client.appendSet(logged);
      } catch (e) {
        const text =
          `Could not save that set: ${errorText(e)}. ` +
          "It is kept, marked as not saved yet, and will be saved as soon as that works again.";
        set((s) => ({
          unsavedSets: [...s.unsavedSets, logged.id],
          appNotice: { kind: "error", text },
        }));
        return;
      }
      backendWorked();
    },
  };
}
