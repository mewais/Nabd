import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand";
import type { Exercise, LoggedSet, Settings } from "@nabd/domain";
import { MUSCLE_PRIMARY_GROUP, SettingsSchema, dateKey, kgFromDisplay } from "@nabd/domain";
import type { IpcClient, Singletons } from "@nabd/ipc-client";
import { NudgePolicy } from "@nabd/nudge";
import { ProgramEditor, type ProgramEdit } from "@nabd/program-editor";
import { dayIdAfterEdit, rollOver, type PlanItem } from "@nabd/scheduling";
import { parseImport } from "@nabd/serialization";
import { LogSession } from "@nabd/session";
import { STORED_NAMES, loadNotice, readSnapshot } from "./hydration";
import { selectCoach, selectLibrary, selectPolicyStatus, selectTodayPlan } from "./selectors";
import {
  EMPTY_DRAFT,
  initialState,
  type ExerciseDraft,
  type LibraryState,
  type LibraryTarget,
  type LoadProblem,
  type MapStyle,
  type MapView,
  type NabdState,
  type ProgressTab,
  type Screen,
} from "./state";

/** Completed days kept for the completion charts. */
const DAY_LOG_LIMIT = 400;

export interface NabdActions {
  /** Load persisted state from the backend and open today. Never rejects (see `loadProblems`). */
  hydrate: () => Promise<void>;
  /** Advance the clock: new time, latest idle reading, day rollover, nudge latch. */
  tick: (idleSeconds: number) => void;

  // nudging
  snooze: () => void;
  togglePause: () => void;

  // logging
  /**
   * Open the logger on an exercise (default: the next one due). This answers a
   * pending nudge: the sets logged in the session are attributed to it.
   */
  openSession: (itemId?: string) => void;
  closeSession: () => void;
  focusItem: (itemId: string) => void;
  stepReps: (direction: number) => void;
  /** Step the load by one weight increment. */
  stepWeight: (direction: number) => void;
  setReps: (reps: number) => void;
  /** Set the load from a value typed in the display unit. */
  setWeight: (displayValue: number) => void;
  /** Fill the form with the coach's primary or alternative suggestion. */
  applyAdvice: (which: "primary" | "alternative") => void;
  logSet: () => Promise<void>;
  undoSet: (setId: string) => Promise<void>;
  /** Skip (or un-skip) an exercise today; an untouched extra is removed instead. */
  toggleSkip: (itemId: string) => void;

  // plan
  editProgram: (edit: ProgramEdit) => void;
  selectPlanDay: (dayId: string) => void;

  // exercise library
  openLibrary: (target: LibraryTarget) => void;
  closeLibrary: () => void;
  patchLibrary: (patch: Partial<Pick<LibraryState, "search" | "group">>) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  pickExercise: (exId: string) => void;
  deleteCustomExercise: (exId: string) => void;

  // settings + data
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: () => Promise<void>;
  importData: (json: string) => Promise<void>;

  // view
  setScreen: (screen: Screen) => void;
  setMapView: (view: MapView) => void;
  setMapStyle: (style: MapStyle) => void;
  setSettingsOpen: (open: boolean) => void;
  setProgressTab: (tab: ProgressTab) => void;
  setChartExercise: (exId: string | null) => void;
  /** Dismiss the app-level notice. */
  dismissNotice: () => void;
}

export type NabdStore = NabdState & NabdActions;

export interface StoreDeps {
  client: IpcClient;
  now: () => Date;
  newId: () => string;
}

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Create the app store: state + actions, persisting through `deps.client`. */
export function createNabdStore({ client, now, newId }: StoreDeps): StoreApi<NabdStore> {
  return createStore<NabdStore>((set, get) => {
    /**
     * The one path to the backend for anything that can fail: a failure never
     * throws into the UI, it becomes the app-level notice. Resolves to whether
     * the call worked.
     */
    async function attempt(what: string, call: () => Promise<unknown>): Promise<boolean> {
      try {
        await call();
        return true;
      } catch (e) {
        set({ appNotice: { kind: "error", text: `Could not ${what}: ${errorText(e)}` } });
        return false;
      }
    }

    /** Write a singleton to the backend — unless its stored copy could not be read (see LoadProblem). */
    function persist<K extends keyof Singletons>(key: K, value: Singletons[K]): void {
      const unreadable = (p: LoadProblem): boolean => p.source === key || p.source === "everything";
      if (get().loadProblems.some(unreadable)) return;
      void attempt(`save ${STORED_NAMES[key]}`, () => client.save(key, value));
    }

    /** Update one persisted singleton in state and in the backend. */
    function save<K extends keyof Singletons>(key: K, value: Singletons[K]): void {
      set({ [key]: value } as Pick<NabdState, K>);
      persist(key, value);
    }

    const applyAutostart = (enabled: boolean): void =>
      void attempt("change start at login", () => client.setAutostart(enabled));
    const applyVibrancy = (opacity: number): void =>
      void attempt("apply the translucent window", () => client.setVibrancy(opacity));

    /** Apply a change to the open session, if there is one. */
    function editSession(change: (session: LogSession) => LogSession): void {
      const { session } = get();
      if (session) set({ session: change(session) });
    }

    /** The open session's exercise, if the session and the exercise both still exist. */
    function sessionItem() {
      const { session } = get();
      return session ? (selectTodayPlan(get()).item(session.itemId) ?? null) : null;
    }

    /**
     * Close out a finished day and open today, if the calendar day has changed;
     * returns whether it had. Every action that reads or writes "today" starts
     * here, so none of them can act on a day that is already over.
     */
    function beginDay(): boolean {
      const s = get();
      const today = now();
      if (s.dayState.date === dateKey(today)) return false;
      const library = selectLibrary(s);
      const { dayState, rotation, records } = rollOver({
        program: s.program,
        dayState: s.dayState,
        rotation: s.rotationState,
        history: s.history,
        date: today,
        lookup: (id) => library.byId(id),
      });
      const closed = new Set(records.map((record) => record.date));
      const dayLog = [...s.dayLog.filter((r) => !closed.has(r.date)), ...records].slice(
        -DAY_LOG_LIMIT,
      );
      set({
        dayState,
        rotationState: rotation,
        dayLog,
        session: null,
        paused: dayState.paused,
        snoozedUntil: null,
        activeSince: null,
        pendingNudge: null,
      });
      // The backend takes these as three writes, so a crash can fall between
      // them. The order makes that harmless: the day log first (a repeated
      // rollover replaces its records by date), then the day state, which is
      // what marks the rollover as done, and the rotation last — losing it only
      // repeats a pool's exercise once, whereas writing it before the day state
      // would advance every pool twice when the rollover is redone.
      persist("dayLog", dayLog);
      persist("dayState", dayState);
      persist("rotationState", rotation);
      return true;
    }

    /** Keep the nudge bookkeeping in step with the clock and the plan. */
    function watchNudge(): void {
      const s = get();
      const hasWork = selectTodayPlan(s).setsRemaining > 0;
      const activeSince = hasWork ? (s.activeSince ?? s.now) : null;
      const status = selectPolicyStatus({ ...s, activeSince });
      // An open logger is already the answer; nothing new fires over it.
      const pendingNudge =
        s.session === null ? NudgePolicy.latch(s.pendingNudge, status, s.now) : s.pendingNudge;
      if (activeSince !== s.activeSince || pendingNudge !== s.pendingNudge) {
        set({ activeSince, pendingNudge });
      }
    }

    function openSession(itemId?: string): void {
      beginDay();
      const s = get();
      const plan = selectTodayPlan(s);
      const item = (itemId === undefined ? plan.nextItem : plan.item(itemId)) ?? plan.items[0];
      if (!item) return;
      const nudge = s.pendingNudge;
      set({
        session: LogSession.open(item, selectCoach(s).startFor(item), nudge?.reason ?? "manual"),
        pendingNudge: null,
        // An answered nudge goes quiet like a snoozed one, so closing the logger
        // without logging does not bring it straight back.
        snoozedUntil: nudge ? NudgePolicy.snoozeUntil(now()) : s.snoozedUntil,
      });
    }

    /** Add an exercise to today outside the plan; returns its item in today's queue. */
    function addExtra(exId: string): PlanItem | undefined {
      const { dayState } = get();
      const extra = { id: newId(), exId };
      save("dayState", { ...dayState, extras: [...dayState.extras, extra] });
      return selectTodayPlan(get()).item(extra.id);
    }

    /**
     * The open session and its exercise, on today's plan. If midnight passed
     * with the logger open, the day is rolled over first and the draft moves to
     * today's queue (as an extra when today does not plan that exercise), so a
     * set is never stamped with one day's date and another day's plan item.
     */
    function sessionForLogging(): { session: LogSession; item: PlanItem } | null {
      const { session } = get();
      const item = sessionItem();
      if (!session || !item) return null;
      if (!beginDay()) return { session, item };

      const plan = selectTodayPlan(get());
      const exId = item.exercise.id;
      const target =
        plan.item(item.id) ?? plan.items.find((i) => i.exercise.id === exId) ?? addExtra(exId);
      if (!target) return null;
      const moved = session.focus(target, { reps: session.reps, weight: session.weight });
      set({ session: moved });
      return { session: moved, item: target };
    }

    return {
      ...initialState(now()),

      hydrate: async () => {
        let snapshot;
        try {
          snapshot = await client.loadAll();
        } catch (e) {
          const loadProblems: LoadProblem[] = [{ source: "everything", detail: errorText(e) }];
          set({ loadProblems, appNotice: loadNotice(loadProblems), booted: true });
          return;
        }
        const { state, problems } = readSnapshot(snapshot, now());
        set({
          ...state,
          paused: state.dayState.paused,
          loadProblems: problems,
          appNotice: loadNotice(problems),
          now: now(),
          booted: true,
        });
        // Make sure the day we are on is on record, so the next launch can roll it over.
        if (!beginDay()) persist("dayState", get().dayState);
        watchNudge();
        // Bring the OS in line with the stored settings.
        applyAutostart(state.settings.openAtStartup);
        if (state.settings.glass) applyVibrancy(state.settings.opacity);
      },

      tick: (idleSeconds) => {
        set({ now: now(), idleSeconds });
        beginDay();
        watchNudge();
      },

      // ----- nudging -----

      snooze: () => set({ snoozedUntil: NudgePolicy.snoozeUntil(now()), pendingNudge: null }),

      togglePause: () => {
        const paused = !get().paused;
        set({ paused, pendingNudge: null });
        save("dayState", { ...get().dayState, paused });
      },

      // ----- logging -----

      openSession,

      closeSession: () => set({ session: null }),

      focusItem: (itemId) => {
        const item = selectTodayPlan(get()).item(itemId);
        if (item) editSession((s) => s.focus(item, selectCoach(get()).startFor(item)));
      },

      stepReps: (direction) => {
        const item = sessionItem();
        if (item) editSession((s) => s.stepReps(item, direction));
      },

      stepWeight: (direction) => {
        const { weightIncrement, weightUnit } = get().settings;
        editSession((s) => s.stepWeight(direction, kgFromDisplay(weightIncrement, weightUnit)));
      },

      setReps: (reps) => editSession((s) => s.withReps(reps)),

      setWeight: (displayValue) =>
        editSession((s) => s.withWeight(kgFromDisplay(displayValue, get().settings.weightUnit))),

      applyAdvice: (which) => {
        const item = sessionItem();
        const target = item && selectCoach(get()).adviceFor(item)?.[which];
        if (target) editSession((s) => s.withReps(target.reps).withWeight(target.weight ?? 0));
      },

      logSet: async () => {
        const entry = sessionForLogging();
        if (!entry) return;
        const { session, item } = entry;

        const at = now();
        const { reps, weight } = session.performance(item);
        const logged: LoggedSet = {
          id: newId(),
          exId: item.exercise.id,
          exercise: item.exercise.name,
          group: item.exercise.group,
          muscles: [...item.exercise.primary, ...item.exercise.secondary],
          value: reps,
          weight,
          ts: at.toISOString(),
          date: dateKey(at),
          trigger: session.trigger,
          planItemId: item.id,
          setType: item.nextSet?.type ?? "working",
        };
        // Show the set first; saving must never be able to stall the logger.
        set((s) => ({ history: [...s.history, logged], snoozedUntil: null, pendingNudge: null }));

        const next = selectTodayPlan(get()).focusAfter(item.id);
        const rested = session.resting(at, item.prescription?.rest ?? 0);
        set({
          session:
            next && next.id !== item.id
              ? rested.focus(next, selectCoach(get()).startFor(next))
              : rested,
        });

        await attempt("save that set", () => client.appendSet(logged));
      },

      // The backend goes first: a set that could not be deleted stays on screen.
      undoSet: async (setId) => {
        if (await attempt("undo that set", () => client.deleteSet(setId))) {
          set((s) => ({ history: s.history.filter((h) => h.id !== setId) }));
        }
      },

      toggleSkip: (itemId) => {
        const { dayState } = get();
        const item = selectTodayPlan(get()).item(itemId);
        if (!item) return;
        if (item.isExtra && item.done === 0) {
          save("dayState", { ...dayState, extras: dayState.extras.filter((e) => e.id !== itemId) });
          return;
        }
        const skipped = item.skipped
          ? dayState.skipped.filter((id) => id !== itemId)
          : [...dayState.skipped, itemId];
        save("dayState", { ...dayState, skipped });
      },

      // ----- plan -----

      editProgram: (edit) => {
        const { program, dayState } = get();
        const library = selectLibrary(get());
        const edited = edit(new ProgramEditor(program, newId, (id) => library.byId(id)));
        // A floating plan stays on the day it is on, however the days around it change.
        const dayId = dayIdAfterEdit(program, edited, dayState.dayId);
        if (dayId !== dayState.dayId) save("dayState", { ...dayState, dayId });
        save("program", edited);
      },
      selectPlanDay: (dayId) => set({ planEditDay: dayId }),

      // ----- exercise library -----

      openLibrary: (target) => set((s) => ({ library: { ...s.library, target } })),
      closeLibrary: () => set((s) => ({ library: { ...s.library, target: null, draft: null } })),
      patchLibrary: (patch) => set((s) => ({ library: { ...s.library, ...patch } })),

      startDraft: (copyOf) => {
        const source = copyOf === undefined ? undefined : selectLibrary(get()).byId(copyOf);
        const draft: ExerciseDraft = source
          ? {
              name: `${source.name} (copy)`,
              primary: [...source.primary],
              secondary: [...source.secondary],
              equipment: source.equipment,
              tracking: source.tracking,
            }
          : EMPTY_DRAFT;
        set((s) => ({ library: { ...s.library, draft } }));
      },

      patchDraft: (patch) =>
        set((s) =>
          s.library.draft
            ? { library: { ...s.library, draft: { ...s.library.draft, ...patch } } }
            : s,
        ),

      cancelDraft: () => set((s) => ({ library: { ...s.library, draft: null } })),

      saveDraft: () => {
        const { library, customExercises } = get();
        const draft = library.draft;
        const lead = draft?.primary[0];
        if (!draft || lead === undefined || draft.name.trim() === "") return;
        const exercise: Exercise = {
          id: newId(),
          name: draft.name.trim(),
          group: MUSCLE_PRIMARY_GROUP[lead],
          primary: draft.primary,
          secondary: draft.secondary.filter((m) => !draft.primary.includes(m)),
          equipment: draft.equipment,
          tracking: draft.tracking,
          custom: true,
        };
        save("customExercises", [...customExercises, exercise]);
        set({ library: { ...library, draft: null } });
      },

      pickExercise: (exId) => {
        const target = get().library.target;
        if (target === null) return;
        if (target.kind === "pool") {
          // Stay open: a pool usually takes several exercises.
          get().editProgram((e) => e.addToPool(target.dayId, target.slotId, exId));
          return;
        }
        if (target.kind === "exercise") {
          get().editProgram((e) => e.addExercise(target.dayId, exId));
        } else {
          openSession(addExtra(exId)?.id);
        }
        get().closeLibrary();
      },

      deleteCustomExercise: (exId) => {
        save(
          "customExercises",
          get().customExercises.filter((e) => e.id !== exId),
        );
        get().editProgram((e) => e.purgeExercise(exId));
      },

      // ----- settings + data -----

      updateSettings: (patch) => {
        const before = get().settings;
        const parsed = SettingsSchema.safeParse({ ...before, ...patch });
        // An out-of-range value (a stepper pushed past its bound) is simply not applied.
        if (!parsed.success || parsed.data.workStart >= parsed.data.workEnd) return;
        const settings = parsed.data;
        save("settings", settings);
        if (settings.openAtStartup !== before.openAtStartup) {
          applyAutostart(settings.openAtStartup);
        }
        if (settings.glass && (!before.glass || settings.opacity !== before.opacity)) {
          applyVibrancy(settings.opacity);
        }
      },

      exportData: async () => {
        try {
          set({ notice: { kind: "info", text: `Exported to ${await client.exportData()}` } });
        } catch (e) {
          set({ notice: { kind: "error", text: `Export failed: ${errorText(e)}` } });
        }
      },

      importData: async (json) => {
        const result = parseImport(json);
        if (!result.ok) {
          set({ notice: { kind: "error", text: `Import failed — ${result.errors[0]}` } });
          return;
        }
        // The file replaces what it contains; settings it does not mention keep their values.
        const { settings } = result.data;
        const data = settings
          ? { ...result.data, settings: { ...get().settings, ...settings } }
          : result.data;
        try {
          await client.importData(data);
          await get().hydrate();
          set({ notice: { kind: "info", text: "Import complete." } });
        } catch (e) {
          set({ notice: { kind: "error", text: `Import failed: ${errorText(e)}` } });
        }
      },

      // ----- view -----

      setScreen: (screen) => set({ screen }),
      setMapView: (mapView) => set({ mapView }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen, notice: null }),
      setProgressTab: (progressTab) => set({ progressTab }),
      setChartExercise: (chartExercise) => set({ chartExercise }),
      dismissNotice: () => set({ appNotice: null }),
    };
  });
}
