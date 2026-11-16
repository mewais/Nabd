import type { ViewActions } from "./actions";
import type { StoreContext } from "./context";
import { selectTodayPlan } from "./selectors";
import type { NabdState } from "./state";

/** The day the planner opens on: today's, or the first on a rest day; null in an empty plan. */
export function planDayToOpen(state: NabdState): string | null {
  return selectTodayPlan(state).dayId ?? state.program.days[0]?.id ?? null;
}

/** What is on screen: nothing here is persisted. */
export function viewActions({ set }: Pick<StoreContext, "set">): ViewActions {
  return {
    setScreen: (screen) =>
      set((s) => (screen === "planner" ? { screen, planEditDay: planDayToOpen(s) } : { screen })),
    setMapView: (mapView) => set({ mapView }),
    setMapStyle: (mapStyle) => set({ mapStyle }),
    // The import/export notice belongs to one visit of the Settings dialog.
    setSettingsOpen: (settingsOpen) => set({ settingsOpen, notice: null }),
    setProgressTab: (progressTab) => set({ progressTab }),
    setChartExercise: (chartExercise) => set({ chartExercise }),
    dismissNotice: () => set({ appNotice: null }),
  };
}
