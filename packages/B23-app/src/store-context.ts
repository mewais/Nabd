import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { NabdActions, NabdStore } from "@nabd/store";

export const StoreContext = createContext<StoreApi<NabdStore> | null>(null);

function useStoreApi(): StoreApi<NabdStore> {
  const store = useContext(StoreContext);
  if (store === null) throw new Error("StoreContext is missing");
  return store;
}

/** Subscribe to a slice of app state (or to a derived selector). */
export function useNabd<T>(selector: (state: NabdStore) => T): T {
  return useStore(useStoreApi(), selector);
}

/** The store's actions. They never change, so this never re-renders. */
export function useActions(): NabdActions {
  return useStoreApi().getState();
}
