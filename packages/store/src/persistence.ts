import type { LoggedSet } from "@nabd/domain";
import type { Singletons } from "@nabd/ipc-client";
import type { Notice } from "@nabd/view";
import type { StoreCore } from "./context";
import { STORED_NAMES, errorText } from "./state";
import type { NoticePlace } from "./state";
import { setSaver } from "./unsaved-sets";

/** How a backend call went: with what it resolved to, or not at all. */
type Attempt<T> = { ok: true; value: T } | { ok: false };

/** The store's one path to the backend for anything that can fail, and to the user's notices. */
export interface Persistence {
  /** Tell the user something, in the banner unless `place` says otherwise. */
  notify: (kind: Notice["kind"], text: string, place?: NoticePlace) => void;
  /**
   * Run a backend call. A failure never throws into the UI: it becomes a
   * notice ("Could not <what>: …"), in the banner unless `place` says otherwise.
   */
  attempt: <T>(what: string, call: () => Promise<T>, place?: NoticePlace) => Promise<Attempt<T>>;
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

export type Notify = Persistence["notify"];
export type Try = Persistence["attempt"];

/** Notices to the user: in the banner, or in the Settings dialog's own place. */
function noticesFor({ set }: StoreCore): Notify {
  return (kind, text, place = "appNotice") => {
    const notice = { kind, text };
    set(place === "appNotice" ? { appNotice: notice } : { dataNotice: notice });
  };
}

/** Backend calls that report their failure instead of throwing; `worked` hears of each success. */
function attemptsFor(notify: Notify, worked: () => void): Try {
  return async (what, call, place) => {
    try {
      const value = await call();
      worked();
      return { ok: true, value };
    } catch (e) {
      notify("error", `Could not ${what}: ${errorText(e)}`, place);
      return { ok: false };
    }
  };
}

/** The persisted singletons, written unless their stored copy could not be read (see LoadProblem). */
function singletonWriter(
  { set, get, client }: StoreCore,
  attempt: Try,
): Pick<Persistence, "save" | "persist" | "persistTogether"> {
  const writable = (key: string): boolean =>
    !get().loadProblems.some((p) => p.source === key || p.source === "everything");

  const persist: Persistence["persist"] = (key, value) => {
    if (writable(key)) void attempt(`save ${STORED_NAMES[key]}`, () => client.save(key, value));
  };

  return {
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

export function createPersistence(core: StoreCore): Persistence {
  const notify = noticesFor(core);
  // Each call that works is a good moment to retry the waiting sets, and retrying is itself
  // made of attempts: the two refer to each other.
  const attempt = attemptsFor(notify, () => sets.retry());
  const sets = setSaver(core, notify, attempt);
  return {
    notify,
    attempt,
    saveSet: sets.saveSet,
    flushSets: sets.flushSets,
    ...singletonWriter(core, attempt),
  };
}
