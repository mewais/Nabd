import type { ViewActions } from "./actions";
import type { StoreContext } from "./context";

/** What is on screen: nothing here is persisted. */
export function viewActions({ set }: Pick<StoreContext, "set">): ViewActions {
  return {
    setScreen: (screen) => set({ screen }),
    setMapView: (mapView) => set({ mapView }),
    setMapStyle: (mapStyle) => set({ mapStyle }),
    // The import/export notice belongs to one visit of the Settings dialog.
    setSettingsOpen: (settingsOpen) => set({ settingsOpen, notice: null }),
    setProgressTab: (progressTab) => set({ progressTab }),
    setChartExercise: (chartExercise) => set({ chartExercise }),
    dismissNotice: () => set({ appNotice: null }),
  };
}
