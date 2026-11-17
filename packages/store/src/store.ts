import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand";
import { confirmSlice } from "./confirm";
import type { StoreContext, StoreCore, StoreDeps } from "./context";
import { daySlice } from "./day";
import { desktopSlice } from "./desktop";
import { librarySlice } from "./library";
import { loggingSlice } from "./logging";
import { nudgeSlice } from "./nudge";
import { createPersistence } from "./persistence";
import { planSlice } from "./plan";
import { settingsDataSlice } from "./settings-data";
import { settle } from "./settle";
import type { NabdStore } from "./slices";
import { initialState } from "./state";
import { viewSlice } from "./view";

/**
 * Create the app store: state + actions, persisting through `deps.client`.
 *
 * One file per slice. A slice never imports another slice: what one needs of
 * another it asks for like the UI does, through `get().action()`, and what two
 * of them share lives in a helper module (persistence, rollover, open-session,
 * os, selectors).
 */
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
      ...daySlice(ctx),
      ...nudgeSlice(ctx),
      ...loggingSlice(ctx),
      ...planSlice(ctx),
      ...librarySlice(ctx),
      ...settingsDataSlice(ctx),
      ...confirmSlice(ctx),
      ...viewSlice(ctx),
      ...desktopSlice(ctx),
    };
  });
}
