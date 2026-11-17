import type { StoreContext } from "./context";
import { selectPlannerDayToOpen } from "./selectors";
import type { ViewSlice } from "./slices";

/** What is on screen: nothing here is persisted. */
export function viewSlice({ set }: Pick<StoreContext, "set">): ViewSlice {
  return {
    showScreen: (screen) =>
      set((s) =>
        screen === "planner" ? { screen, plannerDayId: selectPlannerDayToOpen(s) } : { screen },
      ),
    setMapView: (mapView) => set({ mapView }),
    setMapStyle: (mapStyle) => set({ mapStyle }),
    setProgressTab: (progressTab) => set({ progressTab }),
    openChart: (chartExercise) => set({ chartExercise }),
    closeChart: () => set({ chartExercise: null }),
    dismissNotice: () => set({ appNotice: null }),
  };
}
