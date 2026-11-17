import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "./slices";
import type { NabdState } from "./state";
import type { Persistence } from "./persistence";

/** What the store needs from the outside world. */
export interface StoreDeps {
  client: IpcClient;
  now: () => Date;
  newId: () => string;
}

/** The outside world plus the store's own state: what persistence is built on. */
export interface StoreCore extends StoreDeps {
  /** Change state. Every change is settled before anyone sees it (see settle.ts). */
  set: (change: Partial<NabdState> | ((state: NabdStore) => Partial<NabdState>)) => void;
  get: () => NabdStore;
}

/** What every slice of the store is built from. */
export type StoreContext = StoreCore & Persistence;
