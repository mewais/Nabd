import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand";
import type { Exercise, LoggedSet, Settings, Trigger } from "@nabd/domain";
import { MUSCLE_PRIMARY_GROUP, SettingsSchema, dateKey, kgFromDisplay } from "@nabd/domain";
import type { IpcClient, Singletons } from "@nabd/ipc-client";
import { NudgePolicy } from "@nabd/nudge";
import { ProgramEditor, type ProgramEdit } from "@nabd/program-editor";
import { rollOver } from "@nabd/scheduling";
import { parseImport } from "@nabd/serialization";
import { LogSession } from "@nabd/session";
import { readSnapshot } from "./hydration";
import { selectCoach, selectLibrary, selectNudgeStatus, selectTodayPlan } from "./selectors";
import {
  EMPTY_DRAFT,
  initialState,
  type ExerciseDraft,
  type LibraryState,
  type LibraryTarget,
  type MapStyle,
  type MapView,
  type NabdState,
  type ProgressTab,
  type Screen,
} from "./state";

/** Completed days kept for the completion charts. */
const DAY_LOG_LIMIT = 400;

export interface NabdActions {
  /** Load persisted state from the backend and open today. */
  hydrate: () => Promise<void>;
  /** Advance the clock: new time, latest idle reading, day rollover. */
  tick: (idleSeconds: number) => void;

  // nudging
  snooze: () => void;
  togglePause: () => void;

  // logging
  /** Open the logger on an exercise (default: the next one due). */
  openSession: (itemId?: string, trigger?: Trigger) => void;
  /** Open the logger for the nudge that is currently due. */
  acceptNudge: () => void;
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
    /** Update one persisted singleton in state and in the backend. */
    function save<K extends keyof Singletons>(key: K, value: Singletons[K]): void {
      set({ [key]: value } as Pick<NabdState, K>);
      void client.save(key, value);
    }

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

    /** Close out a finished day and open today, if the calendar day has changed. */
    function beginDay(): void {
      const s = get();
      const today = now();
      if (s.dayState.date === dateKey(today)) return;
      const library = selectLibrary(s);
      const { dayState, rotation, record } = rollOver({
        program: s.program,
        dayState: s.dayState,
        rotation: s.rotationState,
        history: s.history,
        date: today,
        lookup: (id) => library.byId(id),
      });
      save("dayState", dayState);
      save("rotationState", rotation);
      if (record) save("dayLog", [...s.dayLog, record].slice(-DAY_LOG_LIMIT));
      set({ session: null, paused: false, snoozedUntil: null });
    }

    function openSession(itemId?: string, trigger: Trigger = "manual"): void {
      const plan = selectTodayPlan(get());
      const item = (itemId === undefined ? plan.nextItem : plan.item(itemId)) ?? plan.items[0];
      if (!item) return;
      set({ session: LogSession.open(item, selectCoach(get()).startFor(item), trigger) });
    }

    return {
      ...initialState(now()),

      hydrate: async () => {
        const persisted = readSnapshot(await client.loadAll(), now());
        set({ ...persisted, now: now(), booted: true });
        beginDay();
        // Make sure the day we are on is on record, so the next launch can roll it over.
        void client.save("dayState", get().dayState);
        // Bring the OS in line with the stored settings.
        void client.setAutostart(persisted.settings.openAtStartup);
        if (persisted.settings.glass) void client.setVibrancy(persisted.settings.opacity);
      },

      tick: (idleSeconds) => {
        set({ now: now(), idleSeconds });
        beginDay();
      },

      // ----- nudging -----

      snooze: () => set({ snoozedUntil: NudgePolicy.snoozeUntil(now()) }),
      togglePause: () => set((s) => ({ paused: !s.paused })),

      // ----- logging -----

      openSession,

      acceptNudge: () => {
        const status = selectNudgeStatus(get());
        openSession(undefined, status.state === "due" ? status.reason : "manual");
      },

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
        const { session, history } = get();
        const item = sessionItem();
        if (!session || !item) return;

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
        set({ history: [...history, logged], snoozedUntil: null });

        const next = selectTodayPlan(get()).focusAfter(item.id);
        const rested = session.resting(at, item.prescription?.rest ?? 0);
        set({
          session:
            next && next.id !== item.id
              ? rested.focus(next, selectCoach(get()).startFor(next))
              : rested,
        });

        try {
          await client.appendSet(logged);
        } catch (e) {
          set({ notice: { kind: "error", text: `That set could not be saved: ${errorText(e)}` } });
        }
      },

      undoSet: async (setId) => {
        set((s) => ({ history: s.history.filter((h) => h.id !== setId) }));
        await client.deleteSet(setId);
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
        const library = selectLibrary(get());
        save("program", edit(new ProgramEditor(get().program, newId, (id) => library.byId(id))));
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
        const { library, dayState } = get();
        const target = library.target;
        if (target === null) return;
        if (target.kind === "pool") {
          // Stay open: a pool usually takes several exercises.
          get().editProgram((e) => e.addToPool(target.dayId, target.slotId, exId));
          return;
        }
        if (target.kind === "exercise") {
          get().editProgram((e) => e.addExercise(target.dayId, exId));
        } else {
          const extra = { id: newId(), exId };
          save("dayState", { ...dayState, extras: [...dayState.extras, extra] });
          openSession(extra.id);
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
          void client.setAutostart(settings.openAtStartup);
        }
        if (settings.glass && (!before.glass || settings.opacity !== before.opacity)) {
          void client.setVibrancy(settings.opacity);
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
        try {
          await client.importData(result.data);
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
    };
  });
}
