import type { StoreApi } from "zustand";
import type { IpcClient } from "@nabd/ipc-client";
import type { NabdStore } from "./actions";
import type { Persistence } from "./persistence";

/** What the store needs from the outside world. */
export interface StoreDeps {
  client: IpcClient;
  now: () => Date;
  newId: () => string;
}

/** The outside world plus the store's own state: what persistence is built on. */
export interface StoreCore extends StoreDeps {
  set: StoreApi<NabdStore>["setState"];
  get: () => NabdStore;
}

/** What every slice of the store is built from. */
export type StoreContext = StoreCore & Persistence;
