import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { NabdActions, NabdStore } from "@nabd/store";

const AppStore = createContext<StoreApi<NabdStore> | null>(null);

/** Makes the app store available to the containers below it. */
export const StoreProvider = AppStore.Provider;

function useStoreApi(): StoreApi<NabdStore> {
  const store = useContext(AppStore);
  if (store === null) throw new Error("containers need a StoreProvider");
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
