// @nabd/store — the application store: owns state, mutates it through the pure
// engines (B03–B10), and persists through the IPC client (B14). Built as an
// injectable factory so tests run with a fake client + fixed clock and can
// assert that every mutating action ALSO persists (no silent stubs).

import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand";

import type {
  Program,
  Settings,
  Theme,
  Wallpaper,
  Exercise,
  MuscleGroup,
  Coverage,
  Slot,
  ActiveSession,
  RotationState,
  LoggedSet,
  Trigger,
} from "@nabd/domain";
import { DEFAULT_SETTINGS, DEFAULTS, GLASS_OPACITY } from "@nabd/domain";
import type { IpcClient } from "@nabd/ipc-client";
import type { Library } from "@nabd/dataset";
import type { Notif } from "@nabd/nudge";

// Engine imports
import { resolveTodayDay, buildSlots, applyStatuses, currentSlot } from "@nabd/scheduling";
import {
  openSession,
  logSet as sessionLogSet,
  switchExercise as sessionSwitchExercise,
  stepReps as sessionStepReps,
  stepWeight as sessionStepWeight,
} from "@nabd/session";
import {
  tick as nudgeTick,
  resetIdle as nudgeResetIdle,
  snooze as nudgeSnooze,
  resetTimer as nudgeResetTimer,
  dueNotif,
} from "@nabd/nudge";
import { coverageFrom7dHistory, applySetDelta, emptyCoverage } from "@nabd/coverage";
import {
  addDay,
  removeDay,
  renameDay,
  setWeekday,
  setType,
  setSchedule,
  addExercise,
  removeExercise,
  toggleSuperset,
  addSlot,
  removeSlot,
  addToPool,
  removeFromPool,
  setRepMode,
  setIntensity,
  setRest,
  addSet,
  addWarmup,
  removeSet,
  cycleSetType,
  stepRep,
  stepVal,
  setNotes,
} from "@nabd/program-editor";

export type Screen = "today" | "planner" | "progress";
export type MapView = "both" | "front" | "back";
export type MapStyle = "heat" | "outline";

/** Exercise-library modal state. */
export interface LibState {
  open: boolean;
  target:
    | { kind: "ex"; dayId: string }
    | { kind: "pool"; dayId: string; slotId: string; group: MuscleGroup }
    | null;
  search: string;
  group: string;
  creating: boolean;
  draft: { name: string; group: MuscleGroup; equip: string; secondary: string[]; track: string };
}

export interface NabdState {
  // chrome / nav
  screen: Screen;
  theme: Theme;
  settings: Settings;
  // clock / nudge
  now: Date;
  secondsToNext: number;
  idleSeconds: number;
  notif: Notif | null;
  // plan + library
  program: Program;
  customExercises: Exercise[];
  activeProfileId: string;
  // today
  slots: Slot[];
  coverage: Coverage;
  rotationState: RotationState;
  floatingIndex: number;
  history: LoggedSet[];
  mapView: MapView;
  mapStyle: MapStyle;
  // session
  activeSession: ActiveSession | null;
  // ui flags
  settingsOpen: boolean;
  profileMenu: boolean;
  planEditDay: string | null;
  lib: LibState;
  progTab: "calendar" | "weekly";
  progExercise: number | null;
  booted: boolean;
}

export interface NabdActions {
  /** Load persisted state from the backend and build today. */
  hydrate: () => Promise<void>;
  // navigation / view
  setScreen: (s: Screen) => void;
  setTheme: (t: Theme) => void;
  setMapView: (v: MapView) => void;
  setMapStyle: (s: MapStyle) => void;
  // clock / nudge
  tick: () => void;
  resetIdle: () => void;
  /** Set idle seconds from an authoritative source (OS idle poll); may raise an idle nudge. */
  setIdleSeconds: (seconds: number) => void;
  snooze: () => void;
  confirmNotif: () => void;
  // session
  startNext: () => void;
  openActive: (slotId: string) => void;
  switchExercise: (slotId: string) => void;
  stepReps: (d: number) => void;
  stepWeight: (d: number) => void;
  logSet: (trigger?: Trigger) => Promise<void>;
  closeActive: () => void;
  // settings + persistence
  openSettings: () => void;
  closeSettings: () => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggleGlass: () => void;
  setOpacity: (v: number) => void;
  setWallpaper: (w: Wallpaper) => void;
  setInterval: (d: number) => void;
  setIdleNudge: (d: number) => void;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  // planner (delegate to @nabd/program-editor, then persist)
  planSetType: (t: "fixed" | "cycled") => void;
  planSetSchedule: (s: "weekday" | "floating") => void;
  planSetProfile: (id: string) => void;
  toggleProfileMenu: () => void;
  planSelectDay: (dayId: string) => void;
  planRenameDay: (dayId: string, name: string) => void;
  planSetWeekday: (dayId: string, weekday: number) => void;
  planAddDay: (weekday: number | null) => void;
  planRemoveDay: (dayId: string) => void;
  planAddExercise: (dayId: string, exId: string) => void;
  planRemoveExercise: (dayId: string, rowId: string) => void;
  planToggleSuperset: (dayId: string, rowId: string) => void;
  planAddSlot: (dayId: string, group: MuscleGroup) => void;
  planRemoveSlot: (dayId: string, slotId: string) => void;
  planRemoveFromPool: (dayId: string, slotId: string, exId: string) => void;
  /** Generic prescription edit dispatched to program-editor by op name. */
  planEdit: (
    dayId: string,
    ref: { kind: "ex" | "slot"; id: string },
    op: PlanEditOp,
    ...args: number[]
  ) => void;
  planSetNotes: (dayId: string, ref: { kind: "ex" | "slot"; id: string }, notes: string) => void;
  // library modal
  libOpen: (target: LibState["target"]) => void;
  libClose: () => void;
  libSearch: (q: string) => void;
  libGroup: (g: string) => void;
  libPick: (exId: string) => void;
  libStartCreate: () => void;
  libCancelCreate: () => void;
  libDraft: (k: keyof LibState["draft"], v: unknown) => void;
  libToggleSecondary: (m: string) => void;
  libCreate: () => void;
  // progress
  setProgTab: (t: "calendar" | "weekly") => void;
  openProgChart: (i: number) => void;
  closeProgChart: () => void;
}

export type PlanEditOp =
  | "setRepMode"
  | "setIntensity"
  | "setRest"
  | "addSet"
  | "addWarmup"
  | "removeSet"
  | "cycleSetType"
  | "stepRep"
  | "stepVal";

export type NabdStore = NabdState & NabdActions;

export interface StoreDeps {
  client: IpcClient;
  library: Library;
  now: () => Date;
  newId: () => string;
}

const DEFAULT_LIB_STATE: LibState = {
  open: false,
  target: null,
  search: "",
  group: "",
  creating: false,
  draft: { name: "", group: "Chest", equip: "", secondary: [], track: "" },
};

/** The initial (pre-hydrate) state. */
export function initialState(_deps: StoreDeps): NabdState {
  return {
    screen: "today",
    theme: DEFAULT_SETTINGS.theme,
    settings: DEFAULT_SETTINGS,
    now: _deps.now(),
    secondsToNext: DEFAULT_SETTINGS.interval * 60,
    idleSeconds: 0,
    notif: null,
    program: { name: "My Plan", type: "fixed", schedule: "weekday", days: [] },
    customExercises: [],
    activeProfileId: "default",
    slots: [],
    coverage: emptyCoverage(),
    rotationState: {},
    floatingIndex: 0,
    history: [],
    mapView: "both",
    mapStyle: "heat",
    activeSession: null,
    settingsOpen: false,
    profileMenu: false,
    planEditDay: null,
    lib: { ...DEFAULT_LIB_STATE, draft: { ...DEFAULT_LIB_STATE.draft, secondary: [] } },
    progTab: "calendar",
    progExercise: null,
    booted: false,
  };
}

/** Create a vanilla zustand store wired to the given dependencies. */
export function createNabdStore(deps: StoreDeps): StoreApi<NabdStore> {
  const { client, library, now, newId } = deps;

  // Helper: build lookup from library + custom exercises
  function makeLookup(customExercises: Exercise[]) {
    const lib = library.withCustom(customExercises);
    return (exId: string) => lib.byId(exId);
  }

  // Helper: make history lookup for session engine
  function makeHistoryLookup(history: LoggedSet[]) {
    return (exId: string) => {
      const sets = history.filter((s) => s.exId === exId);
      if (sets.length === 0) return null;
      const last = sets[sets.length - 1];
      return { sets: 1, reps: last.value, weight: last.weight };
    };
  }

  const store = createStore<NabdStore>((set, get) => ({
    ...initialState(deps),

    // -------------------------------------------------------------------------
    // hydrate
    // -------------------------------------------------------------------------
    hydrate: async () => {
      await client.init();
      const snapshot = await client.loadAll();

      const program = snapshot.program ?? {
        name: "My Plan",
        type: "fixed",
        schedule: "weekday",
        days: [],
      };
      const settings = snapshot.settings ?? DEFAULT_SETTINGS;
      const theme = snapshot.theme ?? DEFAULT_SETTINGS.theme;
      const customExercises = snapshot.customExercises ?? [];
      const rotationState = snapshot.rotationState ?? {};
      const history = snapshot.history;

      // Handle dayState
      const dayState = snapshot.dayState;
      const floatingIndex = dayState?.floatingIndex ?? 0;

      const nowDate = now();
      const lookup = makeLookup(customExercises);

      // Resolve today's day
      const ctx = { rotationState, floatingIndex };
      const todayDay = resolveTodayDay(program, nowDate, ctx);

      // Build slots
      let slots: Slot[] = [];
      if (todayDay !== null) {
        const rawSlots = buildSlots(todayDay, lookup, rotationState, settings.interval);
        // Determine how many slots are done from dayState if it matches today's date
        const dateStr = nowDate.toISOString().slice(0, 10);
        const doneCount =
          dayState !== null && dayState.date === dateStr
            ? dayState.slots.filter((s) => s.status === "done").length
            : 0;
        slots = applyStatuses(rawSlots, doneCount);
      }

      // Compute coverage from 7-day history
      const coverage = coverageFrom7dHistory(history, nowDate);

      set({
        program,
        settings,
        theme,
        customExercises,
        rotationState,
        floatingIndex,
        history,
        slots,
        coverage,
        secondsToNext: settings.interval * 60,
        idleSeconds: 0,
        booted: true,
      });
    },

    // -------------------------------------------------------------------------
    // Navigation / view
    // -------------------------------------------------------------------------
    setScreen: (s: Screen) => set({ screen: s }),
    setMapView: (v: MapView) => set({ mapView: v }),
    setMapStyle: (s: MapStyle) => set({ mapStyle: s }),

    // -------------------------------------------------------------------------
    // Theme + settings
    // -------------------------------------------------------------------------
    setTheme: (t: Theme) => {
      set({ theme: t });
      void client.saveSingleton("theme", t);
    },

    toggleGlass: () => {
      const state = get();
      const settings = { ...state.settings, glass: !state.settings.glass };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    setOpacity: (d: number) => {
      const state = get();
      const { floor, max } = GLASS_OPACITY[state.settings.theme];
      const next = Math.round((state.settings.opacity + d * 0.05) * 1000) / 1000;
      const opacity = Math.min(max, Math.max(floor, next));
      const settings = { ...state.settings, opacity };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    setWallpaper: (w: Wallpaper) => {
      const state = get();
      const settings = { ...state.settings, wallpaper: w };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const state = get();
      const settings = { ...state.settings, [key]: value };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    setInterval: (d: number) => {
      const state = get();
      const interval = Math.min(180, Math.max(5, state.settings.interval + d * 5));
      const settings = { ...state.settings, interval };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    setIdleNudge: (d: number) => {
      const state = get();
      const idleNudge = Math.min(600, Math.max(5, state.settings.idleNudge + d * 5));
      const settings = { ...state.settings, idleNudge };
      set({ settings });
      void client.saveSingleton("settings", settings);
    },

    // -------------------------------------------------------------------------
    // Settings UI
    // -------------------------------------------------------------------------
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),

    // -------------------------------------------------------------------------
    // Data export / import
    // -------------------------------------------------------------------------
    exportData: async () => {
      return client.exportData();
    },

    importData: async (json: string) => {
      return client.importData(json);
    },

    // -------------------------------------------------------------------------
    // Clock / nudge
    // -------------------------------------------------------------------------
    tick: () => {
      const state = get();
      const cs = currentSlot(state.slots);
      const nudgeState = {
        secondsToNext: state.secondsToNext,
        idleSeconds: state.idleSeconds,
        idleNudge: state.settings.idleNudge,
        busy: state.activeSession !== null || state.notif !== null,
        notif: state.notif,
      };
      const next = nudgeTick({ state: nudgeState, currentSlot: cs });
      set({
        secondsToNext: next.secondsToNext,
        idleSeconds: next.idleSeconds,
        notif: next.notif,
      });
    },

    resetIdle: () => {
      const state = get();
      const nudgeState = {
        secondsToNext: state.secondsToNext,
        idleSeconds: state.idleSeconds,
        idleNudge: state.settings.idleNudge,
        busy: state.activeSession !== null || state.notif !== null,
        notif: state.notif,
      };
      const next = nudgeResetIdle(nudgeState);
      set({ idleSeconds: next.idleSeconds });
    },

    setIdleSeconds: (seconds: number) => {
      const state = get();
      const cs = currentSlot(state.slots);
      const shouldNotify =
        seconds >= state.settings.idleNudge &&
        state.activeSession === null &&
        state.notif === null &&
        cs !== null;
      set({
        idleSeconds: seconds,
        ...(shouldNotify ? { notif: dueNotif("idle", cs!) } : {}),
      });
    },

    snooze: () => {
      const state = get();
      const nudgeState = {
        secondsToNext: state.secondsToNext,
        idleSeconds: state.idleSeconds,
        idleNudge: state.settings.idleNudge,
        busy: state.activeSession !== null || state.notif !== null,
        notif: state.notif,
      };
      const next = nudgeSnooze(nudgeState, DEFAULTS.snoozeSec);
      set({
        notif: next.notif,
        secondsToNext: next.secondsToNext,
        idleSeconds: next.idleSeconds,
      });
    },

    confirmNotif: () => {
      const state = get();
      const notif = state.notif!;
      const slotId = notif.slot.id;
      set({ notif: null });
      get().openActive(slotId);
    },

    // -------------------------------------------------------------------------
    // Session
    // -------------------------------------------------------------------------
    startNext: () => {
      const state = get();
      const cs = currentSlot(state.slots)!;
      get().openActive(cs.id);
    },

    openActive: (slotId: string) => {
      const state = get();
      const slot = state.slots.find((s) => s.id === slotId)!;
      const histLookup = makeHistoryLookup(state.history);
      const session = openSession(slot, histLookup);
      set({ activeSession: session });
    },

    switchExercise: (slotId: string) => {
      const state = get();
      const histLookup = makeHistoryLookup(state.history);
      const session = sessionSwitchExercise(state.activeSession!, state.slots, slotId, histLookup);
      set({ activeSession: session });
    },

    stepReps: (d: number) => {
      const state = get();
      const session = sessionStepReps(state.activeSession!, d);
      set({ activeSession: session });
    },

    stepWeight: (d: number) => {
      const state = get();
      const session = sessionStepWeight(state.activeSession!, d);
      set({ activeSession: session });
    },

    logSet: async (trigger: Trigger = "manual") => {
      const state = get();
      if (state.activeSession === null) return;

      const histLookup = makeHistoryLookup(state.history);
      const result = sessionLogSet(state.activeSession, state.slots, histLookup);

      const nowDate = now();
      const ts = nowDate.toISOString();
      const date = ts.slice(0, 10);
      const id = newId();

      const loggedSet: LoggedSet = {
        id,
        exId: result.logged.exId,
        exercise: result.logged.exercise,
        group: result.logged.group,
        muscles: result.logged.muscles,
        value: result.logged.value,
        weight: result.logged.weight,
        trigger,
        ts,
        date,
      };

      // Update coverage
      const coverage = applySetDelta(
        state.coverage,
        result.coverageMuscles,
        DEFAULTS.coveragePerSet,
      );

      // Update history
      const history = [...state.history, loggedSet];

      // Reset timer
      const nudgeState = {
        secondsToNext: state.secondsToNext,
        idleSeconds: state.idleSeconds,
        idleNudge: state.settings.idleNudge,
        busy: true,
        notif: state.notif,
      };
      const nudgeNext = nudgeResetTimer(nudgeState, state.settings.interval);

      // Persist the logged set
      await client.appendSet(loggedSet);

      // Build dayState for persistence
      const dayState = {
        date,
        floatingIndex: state.floatingIndex,
        slots: result.slots,
      };
      void client.saveSingleton("dayState", dayState);

      set({
        activeSession: result.session,
        slots: result.slots,
        coverage,
        history,
        secondsToNext: nudgeNext.secondsToNext,
        idleSeconds: nudgeNext.idleSeconds,
        notif: nudgeNext.notif,
      });
    },

    closeActive: () => set({ activeSession: null }),

    // -------------------------------------------------------------------------
    // Planner
    // -------------------------------------------------------------------------
    planSetType: (t: "fixed" | "cycled") => {
      const state = get();
      const lookup = makeLookup(state.customExercises);
      const program = setType(state.program, t, lookup);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planSetSchedule: (s: "weekday" | "floating") => {
      const state = get();
      const program = setSchedule(state.program, s);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planSetProfile: (id: string) => {
      set({ activeProfileId: id });
    },

    toggleProfileMenu: () => {
      const state = get();
      set({ profileMenu: !state.profileMenu });
    },

    planSelectDay: (dayId: string) => {
      set({ planEditDay: dayId });
    },

    planRenameDay: (dayId: string, name: string) => {
      const state = get();
      const program = renameDay(state.program, dayId, name);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planSetWeekday: (dayId: string, weekday: number) => {
      const state = get();
      const program = setWeekday(state.program, dayId, weekday);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planAddDay: (weekday: number | null) => {
      const state = get();
      const id = newId();
      const program = addDay(state.program, id, weekday);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planRemoveDay: (dayId: string) => {
      const state = get();
      const program = removeDay(state.program, dayId);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planAddExercise: (dayId: string, exId: string) => {
      const state = get();
      const lookup = makeLookup(state.customExercises);
      const ex = lookup(exId)!;
      const program = addExercise(state.program, dayId, ex);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planRemoveExercise: (dayId: string, rowId: string) => {
      const state = get();
      const program = removeExercise(state.program, dayId, rowId);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planToggleSuperset: (dayId: string, rowId: string) => {
      const state = get();
      const program = toggleSuperset(state.program, dayId, rowId);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planAddSlot: (dayId: string, group: MuscleGroup) => {
      const state = get();
      const program = addSlot(state.program, dayId, group);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planRemoveSlot: (dayId: string, slotId: string) => {
      const state = get();
      const program = removeSlot(state.program, dayId, slotId);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planRemoveFromPool: (dayId: string, slotId: string, exId: string) => {
      const state = get();
      const program = removeFromPool(state.program, dayId, slotId, exId);
      set({ program });
      void client.saveSingleton("program", program);
    },

    planEdit: (
      dayId: string,
      ref: { kind: "ex" | "slot"; id: string },
      op: PlanEditOp,
      ...args: number[]
    ) => {
      const state = get();
      let program: Program;
      switch (op) {
        case "setRepMode": {
          const modes = ["range", "fixed", "time"] as const;
          program = setRepMode(state.program, dayId, ref, modes[args[0] % 3]);
          break;
        }
        case "setIntensity": {
          const intensities = ["none", "rpe", "pct"] as const;
          program = setIntensity(state.program, dayId, ref, intensities[args[0] % 3]);
          break;
        }
        case "setRest":
          program = setRest(state.program, dayId, ref, args[0]);
          break;
        case "addSet":
          program = addSet(state.program, dayId, ref);
          break;
        case "addWarmup":
          program = addWarmup(state.program, dayId, ref);
          break;
        case "removeSet":
          program = removeSet(state.program, dayId, ref, args[0]);
          break;
        case "cycleSetType":
          program = cycleSetType(state.program, dayId, ref, args[0]);
          break;
        case "stepRep": {
          const which = args[1] === 1 ? "a" : "b";
          program = stepRep(state.program, dayId, ref, args[0], which, args[2]);
          break;
        }
        case "stepVal":
          program = stepVal(state.program, dayId, ref, args[0], args[1]);
          break;
      }
      set({ program });
      void client.saveSingleton("program", program);
    },

    planSetNotes: (dayId: string, ref: { kind: "ex" | "slot"; id: string }, notes: string) => {
      const state = get();
      const program = setNotes(state.program, dayId, ref, notes);
      set({ program });
      void client.saveSingleton("program", program);
    },

    // -------------------------------------------------------------------------
    // Library modal
    // -------------------------------------------------------------------------
    libOpen: (target: LibState["target"]) => {
      set((s) => ({ lib: { ...s.lib, open: true, target } }));
    },

    libClose: () => {
      set((s) => ({ lib: { ...s.lib, open: false } }));
    },

    libSearch: (q: string) => {
      set((s) => ({ lib: { ...s.lib, search: q } }));
    },

    libGroup: (g: string) => {
      set((s) => ({ lib: { ...s.lib, group: g } }));
    },

    libStartCreate: () => {
      set((s) => ({ lib: { ...s.lib, creating: true } }));
    },

    libCancelCreate: () => {
      set((s) => ({ lib: { ...s.lib, creating: false } }));
    },

    libDraft: (k: keyof LibState["draft"], v: unknown) => {
      set((s) => ({ lib: { ...s.lib, draft: { ...s.lib.draft, [k]: v } } }));
    },

    libToggleSecondary: (m: string) => {
      set((s) => {
        const secondary = s.lib.draft.secondary.includes(m)
          ? s.lib.draft.secondary.filter((x) => x !== m)
          : [...s.lib.draft.secondary, m];
        return { lib: { ...s.lib, draft: { ...s.lib.draft, secondary } } };
      });
    },

    libPick: (exId: string) => {
      const state = get();
      const target = state.lib.target;
      if (target !== null && target.kind === "ex") {
        get().planAddExercise(target.dayId, exId);
      }
      set((s) => ({ lib: { ...s.lib, open: false } }));
    },

    libCreate: () => {
      const state = get();
      const draft = state.lib.draft;
      const id = newId();
      const newExercise: Exercise = {
        id,
        name: draft.name,
        group: draft.group,
        primary: [draft.group.toLowerCase() as import("@nabd/domain").MuscleKey],
        secondary: draft.secondary as import("@nabd/domain").MuscleKey[],
        equipment: draft.equip as import("@nabd/domain").Equipment,
        tracking: draft.track as import("@nabd/domain").TrackingType,
        timeBased: false,
        custom: true,
      };
      const customExercises = [...state.customExercises, newExercise];
      set({ customExercises });
      void client.saveSingleton("customExercises", customExercises);
      get().libPick(id);
    },

    // -------------------------------------------------------------------------
    // Progress
    // -------------------------------------------------------------------------
    setProgTab: (t: "calendar" | "weekly") => set({ progTab: t }),
    openProgChart: (i: number) => set({ progExercise: i }),
    closeProgChart: () => set({ progExercise: null }),
  }));

  return store;
}
