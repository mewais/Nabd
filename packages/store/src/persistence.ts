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
}

export function createPersistence({ set, get, client }: StoreCore): Persistence {
  const attempt: Persistence["attempt"] = async (what, call) => {
    try {
      await call();
      return true;
    } catch (e) {
      set({ appNotice: { kind: "error", text: `Could not ${what}: ${errorText(e)}` } });
      return false;
    }
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
    save: (key, value) => {
      set((state) => ({ ...state, [key]: value }));
      persist(key, value);
    },
    persistTogether: (what, values) => {
      const entries = Object.entries(values).filter(([key]) => writable(key));
      if (entries.length === 0) return;
      void attempt(`save ${what}`, () => client.saveMany(Object.fromEntries(entries)));
    },
  };
}
