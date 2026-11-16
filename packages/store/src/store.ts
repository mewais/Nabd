import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand";
import type { NabdStore } from "./actions";
import type { StoreContext, StoreCore, StoreDeps } from "./context";
import { confirmActions } from "./confirm";
import { dayActions } from "./day";
import { desktopActions } from "./desktop";
import { libraryActions } from "./library";
import { loggingActions } from "./logging";
import { nudgeActions } from "./nudge";
import { createPersistence } from "./persistence";
import { planActions } from "./plan";
import { settingsDataActions } from "./settings-data";
import { settle } from "./settle";
import { initialState } from "./state";
import { viewActions } from "./view";

/** Create the app store: state + actions, persisting through `deps.client`. */
export function createNabdStore(deps: StoreDeps): StoreApi<NabdStore> {
  return createStore<NabdStore>((setState, get) => {
    const set: StoreCore["set"] = (change) =>
      setState((state) => {
        const patch = typeof change === "function" ? change(state) : change;
        return { ...patch, ...settle(state, { ...state, ...patch }) };
      });
    const core: StoreCore = { ...deps, set, get };
    const ctx: StoreContext = { ...core, ...createPersistence(core) };
    return {
      ...initialState(deps.now()),
      ...dayActions(ctx),
      ...nudgeActions(ctx),
      ...loggingActions(ctx),
      ...planActions(ctx),
      ...libraryActions(ctx),
      ...settingsDataActions(ctx),
      ...confirmActions(ctx),
      ...viewActions(ctx),
      ...desktopActions(ctx),
    };
  });
}
