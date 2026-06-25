import React, { useEffect, useRef } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { NabdStore } from "@nabd/store";

// Shell
import {
  AppLayout,
  Sidebar,
  TopBar,
  greeting,
  formatDate,
  formatClock,
  formatDuration,
} from "@nabd/shell";

// Today screen
import {
  TodayScreen,
  buildHero,
  buildRhythmRows,
} from "@nabd/today";

// Planner screen
import { PlannerScreen } from "@nabd/planner";
import type { PlannerCallbacks } from "@nabd/planner";

// Progress screen
import { ProgressScreen } from "@nabd/progress";

// Modals
import {
  SessionModal,
  NotificationToast,
  SettingsModal,
  LibraryModal,
  FullHistoryChartModal,
  buildSessionList,
  buildChartVM,
} from "@nabd/modals";
import type { LibraryItem } from "@nabd/modals";

// Engines
import { currentSlot } from "@nabd/scheduling";
import { suggest } from "@nabd/progression";
import { insight, computePlanVolume, planCoverage } from "@nabd/coverage";

// Domain constants
import {
  GYM_PROFILES,
  MUSCLE_NAMES,
  MUSCLE_GROUPS,
  EQUIPMENT_NAMES,
  TRACK_NAMES,
} from "@nabd/domain";
import type { MuscleGroup } from "@nabd/domain";

// Library
import { defaultLibrary } from "@nabd/dataset";

// Full history series for chart
import { fullHistorySeries } from "@nabd/progression";

export interface AppProps {
  store: StoreApi<NabdStore>;
}

export function App({ store }: AppProps): JSX.Element {
  // ------------------------------------------------------------------
  // Read state from store via zustand
  // ------------------------------------------------------------------
  const screen = useStore(store, (s) => s.screen);
  const theme = useStore(store, (s) => s.theme);
  const settings = useStore(store, (s) => s.settings);
  const now = useStore(store, (s) => s.now);
  const secondsToNext = useStore(store, (s) => s.secondsToNext);
  const idleSeconds = useStore(store, (s) => s.idleSeconds);
  const notif = useStore(store, (s) => s.notif);
  const program = useStore(store, (s) => s.program);
  const customExercises = useStore(store, (s) => s.customExercises);
  const activeProfileId = useStore(store, (s) => s.activeProfileId);
  const slots = useStore(store, (s) => s.slots);
  const coverage = useStore(store, (s) => s.coverage);
  const history = useStore(store, (s) => s.history);
  const mapView = useStore(store, (s) => s.mapView);
  const mapStyle = useStore(store, (s) => s.mapStyle);
  const activeSession = useStore(store, (s) => s.activeSession);
  const settingsOpen = useStore(store, (s) => s.settingsOpen);
  const profileMenu = useStore(store, (s) => s.profileMenu);
  const planEditDay = useStore(store, (s) => s.planEditDay);
  const lib = useStore(store, (s) => s.lib);
  const progTab = useStore(store, (s) => s.progTab);
  const progExercise = useStore(store, (s) => s.progExercise);

  // ------------------------------------------------------------------
  // Destructure actions from store (stable refs - getState doesn't re-render)
  // ------------------------------------------------------------------
  const {
    hydrate,
    tick,
    resetIdle,
    setScreen,
    setTheme,
    setMapView,
    setMapStyle,
    startNext,
    snooze,
    confirmNotif,
    openActive,
    switchExercise,
    stepReps,
    stepWeight,
    logSet,
    closeActive,
    openSettings,
    closeSettings,
    setSetting,
    setOpacity,
    setWallpaper,
    setInterval,
    setIdleNudge,
    exportData,
    importData,
    planSetType,
    planSetSchedule,
    planSetProfile,
    toggleProfileMenu,
    planSelectDay,
    planRenameDay,
    planSetWeekday,
    planAddDay,
    planRemoveDay,
    planAddExercise,
    planRemoveExercise,
    planToggleSuperset,
    planAddSlot,
    planRemoveSlot,
    planRemoveFromPool,
    planEdit,
    planSetNotes,
    libOpen,
    libClose,
    libSearch,
    libGroup,
    libPick,
    libStartCreate,
    libCancelCreate,
    libDraft,
    libToggleSecondary,
    libCreate,
    setProgTab,
    openProgChart,
    closeProgChart,
  } = store.getState();

  // ------------------------------------------------------------------
  // On mount: hydrate, start 1s tick interval, wire idle-reset listeners
  // ------------------------------------------------------------------
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Hydrate once on mount
    void hydrate();

    // 1-second tick
    tickIntervalRef.current = window.setInterval(() => {
      store.getState().tick();
    }, 1000);

    // Idle reset listeners
    const resetIdleFn = () => store.getState().resetIdle();
    window.addEventListener("mousemove", resetIdleFn);
    window.addEventListener("mousedown", resetIdleFn);
    window.addEventListener("keydown", resetIdleFn);
    window.addEventListener("wheel", resetIdleFn);
    window.addEventListener("touchstart", resetIdleFn);

    return () => {
      if (tickIntervalRef.current !== null) {
        window.clearInterval(tickIntervalRef.current);
      }
      window.removeEventListener("mousemove", resetIdleFn);
      window.removeEventListener("mousedown", resetIdleFn);
      window.removeEventListener("keydown", resetIdleFn);
      window.removeEventListener("wheel", resetIdleFn);
      window.removeEventListener("touchstart", resetIdleFn);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Derived: sidebar donut values
  // ------------------------------------------------------------------
  const setsDone = slots.filter((s) => s.status === "done").reduce((acc, s) => acc + s.done, 0);
  const setsTotal = slots.reduce((acc, s) => acc + s.sets, 0);
  const donutPct = setsTotal > 0 ? Math.round((setsDone / setsTotal) * 100) : 0;

  // ------------------------------------------------------------------
  // TopBar values
  // ------------------------------------------------------------------
  const idleActive = idleSeconds >= 0.6 * settings.idleNudge;

  // ------------------------------------------------------------------
  // Active gym profile
  // ------------------------------------------------------------------
  const activeProfile = GYM_PROFILES.find((p) => p.id === activeProfileId) ?? GYM_PROFILES[0]!;

  // ------------------------------------------------------------------
  // Build library with custom exercises
  // ------------------------------------------------------------------
  const mergedLibrary = defaultLibrary().withCustom(customExercises);

  // ------------------------------------------------------------------
  // Screen: Today
  // ------------------------------------------------------------------
  const cs = currentSlot(slots);

  // Suggestion string
  let suggestionStr = "";
  if (cs !== null) {
    const exFromLib = mergedLibrary.byId(cs.exId);
    const track = exFromLib?.tracking ?? "weight_reps";
    const histLookup = history.filter((h) => h.exId === cs.exId);
    const last =
      histLookup.length > 0
        ? {
            sets: 1,
            reps: histLookup[histLookup.length - 1]!.value,
            weight: histLookup[histLookup.length - 1]!.weight,
          }
        : null;
    const sugg = suggest(track, last);
    if (sugg.weight !== null) {
      suggestionStr = `${sugg.sets}×${sugg.reps} @ ${sugg.weight}kg`;
    } else {
      suggestionStr = `${sugg.sets}×${sugg.reps}`;
    }
    if (sugg.note) {
      suggestionStr += ` — ${sugg.note}`;
    }
  }

  const heroVM = buildHero(cs, suggestionStr, cs?.exercise ?? "", setsTotal);
  const rhythmRows = buildRhythmRows(slots);
  const doneCount = slots.filter((s) => s.status === "done").length;

  // Coverage insight
  const { rest: restMuscles, push: pushMuscles } = insight(coverage);
  const insightRest = restMuscles.map((m) => MUSCLE_NAMES[m]);
  const insightPush = pushMuscles.map((m) => MUSCLE_NAMES[m]);

  // Stats (streak is from analytics but available via progression; use simple counts for now)
  const weekSets = history.filter((h) => {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(h.ts) >= cutoff;
  }).length;

  const todayStats = {
    streak: `${slots.filter((s) => s.status === "done").length} done today`,
    weekSets: `${weekSets} sets this week`,
    volume: `${setsTotal} planned today`,
  };

  // ------------------------------------------------------------------
  // Screen: Planner
  // ------------------------------------------------------------------
  // Volume bars for coverage rail
  const planVolume = computePlanVolume(program, (id) => mergedLibrary.byId(id));
  const planCov = planCoverage(planVolume);
  const volumeBars = (Object.entries(planVolume) as [string, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([muscle, sets]) => ({
      muscle,
      name: MUSCLE_NAMES[muscle as import("@nabd/domain").MuscleKey] ?? muscle,
      sets,
      pct: Math.min(100, Math.round((sets / 16) * 100)),
    }));

  // Planner callbacks
  const plannerCb: PlannerCallbacks = {
    onSetType: planSetType,
    onSetSchedule: planSetSchedule,
    onToggleProfileMenu: toggleProfileMenu,
    onSetProfile: planSetProfile,
    onSelectDay: planSelectDay,
    onRenameDay: planRenameDay,
    onSetWeekday: planSetWeekday,
    onAddDay: planAddDay,
    onRemoveDay: planRemoveDay,
    onAddExercise: (dayId) => libOpen({ kind: "ex", dayId }),
    onRemoveExercise: planRemoveExercise,
    onToggleSuperset: planToggleSuperset,
    onAddSlot: planAddSlot,
    onRemoveSlot: planRemoveSlot,
    onAddPool: (dayId, slotId) => {
      // Find the slot's group from the program
      const day = program.days.find((d) => d.id === dayId);
      const slot = day?.slots.find((s) => s.id === slotId);
      const group: MuscleGroup = slot?.group ?? "Chest";
      libOpen({ kind: "pool", dayId, slotId, group });
    },
    onRemoveFromPool: planRemoveFromPool,
    onEdit: (dayId, ref, op, ...args) =>
      planEdit(dayId, ref, op as import("@nabd/store").PlanEditOp, ...args),
    onNotes: planSetNotes,
  };

  // ------------------------------------------------------------------
  // Screen: Progress
  // ------------------------------------------------------------------
  // Calculate planned per week/day from program
  const totalPlannedSets = program.days.reduce((acc, day) => {
    if (program.type === "fixed") {
      return acc + day.exercises.reduce((a, ep) => a + ep.sets.filter((s) => s.type !== "warmup").length, 0);
    }
    return acc + day.slots.reduce((a, sl) => a + sl.sets.filter((s) => s.type !== "warmup").length, 0);
  }, 0);

  const plannedPerWeek = totalPlannedSets;
  const plannedPerDay = program.days.length > 0 ? Math.round(totalPlannedSets / program.days.length) : 0;

  // Exercise name lookup map for progress screen
  const exNames: Record<string, string> = {};
  mergedLibrary.all().forEach((ex) => {
    exNames[ex.id] = ex.name;
  });

  // ------------------------------------------------------------------
  // Library modal props
  // ------------------------------------------------------------------
  const allLibGroups = ["", ...MUSCLE_GROUPS] as const;
  const groupChips = allLibGroups.map((g) => ({
    k: g,
    label: g === "" ? "All" : g,
    active: lib.group === g,
  }));

  // Filter library by active profile for library modal
  const profileFilteredLibrary = mergedLibrary.filterByProfile(activeProfile.equipment);
  const filteredByGroup =
    lib.group !== ""
      ? profileFilteredLibrary.filter((ex) => ex.group === lib.group)
      : profileFilteredLibrary;
  const filteredBySearch =
    lib.search !== ""
      ? filteredByGroup.filter((ex) =>
          ex.name.toLowerCase().includes(lib.search.toLowerCase())
        )
      : filteredByGroup;

  const libraryItems: LibraryItem[] = filteredBySearch.map((ex) => ({
    id: ex.id,
    name: ex.name,
    muscles: [...ex.primary, ...ex.secondary].map((m) => MUSCLE_NAMES[m]).join(", "),
    trackLabel: TRACK_NAMES[ex.tracking],
    equip: EQUIPMENT_NAMES[ex.equipment],
    custom: ex.custom === true,
  }));

  // Library modal title
  let libTitle = "Exercise Library";
  if (lib.target !== null) {
    if (lib.target.kind === "ex") {
      libTitle = "Add Exercise";
    } else {
      libTitle = `Add to Pool — ${lib.target.group}`;
    }
  }

  // Library modal empty msg
  const libEmptyMsg =
    lib.search !== "" || lib.group !== ""
      ? "No exercises match your filter"
      : "No exercises available for this profile";

  // Secondary muscle chips for create form
  const secondaryChips = MUSCLE_GROUPS.map((g) => {
    const key = g.toLowerCase();
    return {
      k: key,
      label: g,
      active: lib.draft.secondary.includes(key),
    };
  });

  // Group / track / equip options for create form
  const groupOptions = MUSCLE_GROUPS.map((g) => ({ k: g, n: g }));
  const trackOptions = (
    [
      "weight_reps",
      "bodyweight_reps",
      "weighted_bodyweight",
      "assisted_bodyweight",
      "duration",
      "weight_duration",
      "distance_duration",
    ] as const
  ).map((k) => ({ k, n: TRACK_NAMES[k] }));
  const eqOptions = (
    [
      "bodyweight",
      "dumbbell",
      "barbell",
      "ezbar",
      "kettlebell",
      "bands",
      "pullupbar",
      "bench",
      "cable",
      "machine",
      "smith",
    ] as const
  ).map((k) => ({ k, n: EQUIPMENT_NAMES[k] }));

  // ------------------------------------------------------------------
  // Session modal props
  // ------------------------------------------------------------------
  const sessionList =
    activeSession !== null ? buildSessionList(slots, activeSession.slotId) : [];
  const setOfLabel =
    activeSession !== null
      ? `Set ${activeSession.logged.length + 1} of ${activeSession.sugg.sets}`
      : "";

  // ------------------------------------------------------------------
  // Chart modal props
  // ------------------------------------------------------------------
  let chartVM = null;
  if (progExercise !== null) {
    // Find the exercise at the given index from progression rows
    const exIds = Array.from(
      new Set(history.map((h) => h.exId))
    );
    const targetExId = exIds[progExercise];
    if (targetExId !== undefined) {
      const exName = exNames[targetExId] ?? targetExId;
      const series = fullHistorySeries(history, targetExId);
      const hasWeight = history.some((h) => h.exId === targetExId && h.weight !== null);
      const unit = hasWeight ? "kg" : "reps";
      const startDate =
        series.length > 0
          ? history.find((h) => h.exId === targetExId)?.date ?? ""
          : "";
      if (series.length > 0) {
        chartVM = buildChartVM(exName, series, unit, startDate);
      }
    }
  }

  // ------------------------------------------------------------------
  // Export handler: fetch JSON and trigger download
  // ------------------------------------------------------------------
  const handleExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nabd-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------------
  // Import handler: open file picker, read, call importData
  // ------------------------------------------------------------------
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleImport = () => {
    if (importInputRef.current === null) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file === undefined) return;
        const text = await file.text();
        await importData(text);
      };
      importInputRef.current = input;
    }
    importInputRef.current.click();
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const sidebarEl = React.createElement(Sidebar, {
    screen,
    onNavigate: setScreen,
    setsDone,
    setsTotal,
    pct: donutPct,
    caption: `${setsDone}/${setsTotal}`,
  });

  const topbarEl = React.createElement(TopBar, {
    greeting: greeting(now.getHours()),
    dateStr: formatDate(now),
    clockStr: formatClock(now),
    nextStr: formatDuration(secondsToNext),
    idleStr: formatDuration(idleSeconds),
    idleActive,
    notifActive: notif !== null,
    theme,
    onTheme: setTheme,
    onOpenSettings: openSettings,
  });

  // TodayScreen uses bodymap's MapView ("front" | "back"), not store's ("both" | "front" | "back")
  // If mapView is "both", fall back to "front" for the body map display
  const todayMapView: import("@nabd/bodymap").MapView =
    mapView === "both" ? "front" : mapView;

  // Screen content
  let screenContent: JSX.Element;
  if (screen === "today") {
    screenContent = React.createElement(TodayScreen, {
      hero: heroVM,
      rhythm: rhythmRows,
      doneCount,
      total: setsTotal,
      coverage,
      mapView: todayMapView,
      mapStyle,
      insightRest,
      insightPush,
      stats: todayStats,
      onStartNext: startNext,
      onSnooze: snooze,
      onStartSlot: openActive,
      onMapView: (v) => setMapView(v as import("@nabd/store").MapView),
      onMapStyle: setMapStyle,
    });
  } else if (screen === "planner") {
    screenContent = React.createElement(PlannerScreen, {
      program,
      library: mergedLibrary,
      profile: activeProfile,
      profiles: GYM_PROFILES,
      activeProfileId,
      profileMenuOpen: profileMenu,
      editDayId: planEditDay,
      volumeBars,
      coverage: planCov,
      cb: plannerCb,
    });
  } else {
    // progress
    screenContent = React.createElement(ProgressScreen, {
      history,
      coverage,
      now,
      plannedPerWeek,
      plannedPerDay,
      exNames,
      tab: progTab,
      onTab: setProgTab,
      onOpenChart: openProgChart,
    });
  }

  // Modals
  const sessionModal =
    activeSession !== null
      ? React.createElement(SessionModal, {
          session: activeSession,
          list: sessionList,
          setOfLabel,
          onPick: switchExercise,
          onStepReps: stepReps,
          onStepWeight: stepWeight,
          onLog: () => void logSet(),
          onClose: closeActive,
        })
      : null;

  const toastModal =
    notif !== null
      ? React.createElement(NotificationToast, {
          reasonLabel: notif.label,
          exercise: notif.slot.exercise,
          sub: `${notif.slot.group} · ${notif.slot.timeStr}`,
          onConfirm: confirmNotif,
          onSnooze: snooze,
        })
      : null;

  const settingsModal = settingsOpen
    ? React.createElement(SettingsModal, {
        settings,
        theme,
        onClose: closeSettings,
        onTheme: setTheme,
        onOpacity: setOpacity,
        onWallpaper: setWallpaper,
        onToggleStartup: () => setSetting("openAtStartup", !settings.openAtStartup),
        onToggleMinimized: () => setSetting("minimizedByDefault", !settings.minimizedByDefault),
        onInterval: setInterval,
        onIdleNudge: setIdleNudge,
        onExport: () => void handleExport(),
        onImport: handleImport,
      })
    : null;

  const libraryModal = React.createElement(LibraryModal, {
    open: lib.open,
    title: libTitle,
    profileName: activeProfile.name,
    browsing: !lib.creating,
    creating: lib.creating,
    search: lib.search,
    groupChips,
    items: libraryItems,
    emptyMsg: libEmptyMsg,
    createLabel: "Create custom exercise",
    draftName: lib.draft.name,
    draftGroup: lib.draft.group,
    draftTrack: lib.draft.track,
    draftEquip: lib.draft.equip,
    groupOptions,
    trackOptions,
    eqOptions,
    secondaryChips,
    onClose: libClose,
    onSearch: libSearch,
    onGroup: libGroup,
    onPick: libPick,
    onCopy: (exId) => {
      // Duplicate: find exercise, create a copy with a new name
      const ex = mergedLibrary.byId(exId);
      if (ex === undefined) return;
      libDraft("name", `${ex.name} (copy)`);
      libDraft("group", ex.group);
      libDraft("track", ex.tracking);
      libDraft("equip", ex.equipment);
      libStartCreate();
    },
    onStartCreate: libStartCreate,
    onCancelCreate: libCancelCreate,
    onDraft: (k, v) => libDraft(k as keyof import("@nabd/store").LibState["draft"], v),
    onToggleSecondary: libToggleSecondary,
    onCreate: libCreate,
  });

  const chartModal =
    progExercise !== null && chartVM !== null
      ? React.createElement(FullHistoryChartModal, {
          vm: chartVM,
          onClose: closeProgChart,
        })
      : null;

  return React.createElement(AppLayout, {
    theme,
    opacity: settings.opacity,
    wallpaper: settings.wallpaper,
    sidebar: sidebarEl,
    topbar: topbarEl,
    children: React.createElement(
      React.Fragment,
      null,
      screenContent,
      sessionModal,
      toastModal,
      settingsModal,
      libraryModal,
      chartModal,
    ),
  });
}
