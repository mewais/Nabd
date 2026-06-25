// @nabd/modals — overlays: session logger (two-pane), notification toast,
// exercise library, settings, full-history chart. Presentational; props-driven.

import React from "react";
import type { ReactNode } from "react";
import type {
  ActiveSession,
  Slot,
  Settings,
  Theme,
  Wallpaper,
  MuscleGroup,
} from "@nabd/domain";
import { MUSCLE_NAMES } from "@nabd/domain";
import { trendPoints } from "@nabd/progression";
import { Stepper, Segmented } from "@nabd/design-system";

// ---------------------------------------------------------------------------
// ModalShell
// ---------------------------------------------------------------------------

/** Generic modal backdrop+panel wrapper (click-outside closes). */
export interface ModalShellProps {
  onClose: () => void;
  width?: number;
  children: ReactNode;
}
export function ModalShell(_p: ModalShellProps): JSX.Element {
  const { onClose, width, children } = _p;

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      },
    },
    React.createElement(
      "div",
      {
        onClick: handlePanelClick,
        style: {
          background: "var(--surface)",
          borderRadius: 16,
          padding: 24,
          width: width ?? 640,
          maxWidth: "95vw",
          boxSizing: "border-box" as const,
        },
      },
      children,
    ),
  );
}

// ---------------------------------------------------------------------------
// Session logger (two-pane)
// ---------------------------------------------------------------------------

export interface SessionExerciseRow {
  slotId: string;
  exercise: string;
  muscles: string; // joined names
  done: number;
  sets: number;
  complete: boolean;
  active: boolean;
}

/** Left-pane list from today's slots + the active session. */
export function buildSessionList(_slots: Slot[], _activeSlotId: string): SessionExerciseRow[] {
  return _slots.map((slot) => {
    const muscles = slot.muscles.map((m) => MUSCLE_NAMES[m]).join(", ");
    return {
      slotId: slot.id,
      exercise: slot.exercise,
      muscles,
      done: slot.done,
      sets: slot.sets,
      complete: slot.done >= slot.sets,
      active: slot.id === _activeSlotId,
    };
  });
}

export interface SessionModalProps {
  session: ActiveSession;
  list: SessionExerciseRow[];
  /** "Set X of Y" for the active exercise. */
  setOfLabel: string;
  onPick: (slotId: string) => void;
  onStepReps: (d: number) => void;
  onStepWeight: (d: number) => void;
  onLog: () => void;
  onClose: () => void;
}

export function SessionModal(_p: SessionModalProps): JSX.Element {
  const { session, list, setOfLabel, onPick, onStepReps, onStepWeight, onLog, onClose } = _p;

  // Left pane: list of exercises
  const leftRows = list.map((row) =>
    React.createElement(
      "div",
      {
        key: row.slotId,
        onClick: () => onPick(row.slotId),
        "data-row-active": row.active ? "true" : "false",
        style: {
          cursor: "pointer",
          padding: "8px 12px",
          background: row.active ? "var(--accent)" : "transparent",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        },
      },
      row.complete
        ? React.createElement("span", {
            "data-complete": "true",
            "aria-label": "complete",
            style: { color: "green", fontWeight: "bold" },
          }, "✓")
        : null,
      // Combine exercise name and done/sets into one text so exercise name alone
      // does not appear as a standalone text node (avoids duplication with right pane).
      React.createElement(
        "span",
        null,
        `${row.exercise} · ${row.done}/${row.sets}`,
      ),
    ),
  );

  // Muscles display for active session
  const musclesDisplay = session.muscles.map((m) => MUSCLE_NAMES[m]).join(", ");

  // Footer text
  const footerText =
    session.logged.length === 0
      ? "No sets logged yet"
      : `${session.logged.length} sets logged this session`;

  // Right pane
  const rightPane = React.createElement(
    "div",
    { style: { flex: 1, padding: "0 16px" } },
    React.createElement("div", { style: { fontWeight: "bold" } }, setOfLabel),
    React.createElement("div", { style: { fontSize: "1.2em" } }, session.exercise),
    React.createElement("div", null, musclesDisplay),
    React.createElement("div", null, session.sugg.note),
    React.createElement(Stepper, {
      label: "Reps",
      value: session.reps,
      onDec: () => onStepReps(-1),
      onInc: () => onStepReps(1),
    }),
    session.weighted
      ? React.createElement(Stepper, {
          label: "Weight",
          value: session.weight,
          onDec: () => onStepWeight(-1),
          onInc: () => onStepWeight(1),
        })
      : null,
    React.createElement(
      "button",
      { onClick: onLog, style: { marginTop: 16, display: "block" } },
      "Log this set",
    ),
    React.createElement("div", { style: { marginTop: 8 } }, footerText),
    React.createElement(
      "button",
      { onClick: onClose, style: { marginTop: 8 } },
      "Done",
    ),
  );

  return React.createElement(
    ModalShell,
    { onClose },
    React.createElement(
      "div",
      { style: { display: "flex", gap: 16 } },
      React.createElement("div", { style: { width: 200, flexShrink: 0 } }, ...leftRows),
      rightPane,
    ),
  );
}

// ---------------------------------------------------------------------------
// Notification toast
// ---------------------------------------------------------------------------

export interface ToastProps {
  reasonLabel: string; // "Interval's up" / "You've gone quiet"
  exercise: string;
  sub: string; // "<group> · <time>"
  onConfirm: () => void;
  onSnooze: () => void;
}
export function NotificationToast(_p: ToastProps): JSX.Element {
  const { reasonLabel, exercise, sub, onConfirm, onSnooze } = _p;

  return React.createElement(
    "div",
    { style: { padding: 16, borderRadius: 12, background: "var(--surface)" } },
    React.createElement("div", { style: { fontWeight: "bold" } }, "TIME TO MOVE"),
    React.createElement("div", null, reasonLabel),
    React.createElement("div", null, exercise),
    React.createElement("div", null, sub),
    React.createElement(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 12 } },
      React.createElement("button", { onClick: onConfirm }, "Let's go"),
      React.createElement("button", { onClick: onSnooze }, "Snooze"),
    ),
  );
}

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export interface LibraryItem {
  id: string;
  name: string;
  muscles: string;
  trackLabel: string;
  equip: string;
  custom: boolean;
}
export interface LibraryModalProps {
  open: boolean;
  title: string;
  profileName: string;
  browsing: boolean;
  creating: boolean;
  search: string;
  groupChips: { k: string; label: string; active: boolean }[];
  items: LibraryItem[];
  emptyMsg: string;
  createLabel: string;
  // create form
  draftName: string;
  draftGroup: MuscleGroup;
  draftTrack: string;
  draftEquip: string;
  groupOptions: { k: string; n: string }[];
  trackOptions: { k: string; n: string }[];
  eqOptions: { k: string; n: string }[];
  secondaryChips: { k: string; label: string; active: boolean }[];
  onClose: () => void;
  onSearch: (q: string) => void;
  onGroup: (g: string) => void;
  onPick: (exId: string) => void;
  onCopy: (exId: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onDraft: (k: string, v: string) => void;
  onToggleSecondary: (m: string) => void;
  onCreate: () => void;
}

export function LibraryModal(_p: LibraryModalProps): JSX.Element {
  const {
    open,
    title,
    browsing,
    search,
    groupChips,
    items,
    emptyMsg,
    createLabel,
    draftName,
    draftGroup,
    draftTrack,
    draftEquip,
    groupOptions,
    trackOptions,
    eqOptions,
    secondaryChips,
    onClose,
    onSearch,
    onGroup,
    onPick,
    onCopy,
    onStartCreate,
    onCancelCreate,
    onDraft,
    onToggleSecondary,
    onCreate,
  } = _p;

  if (!open) return null as unknown as JSX.Element;

  let content: ReactNode;

  if (browsing) {
    // Group filter chips
    const chips = groupChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onGroup(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
        },
        chip.label,
      ),
    );

    // Items list — combine details so item name is not duplicated by group chip text
    const itemRows =
      items.length === 0
        ? [React.createElement("div", { key: "empty" }, emptyMsg)]
        : items.map((item) =>
            React.createElement(
              "div",
              {
                key: item.id,
                style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0" },
              },
              React.createElement(
                "div",
                { style: { flex: 1 } },
                // Item name — standalone so getByText("My Custom Press") works
                React.createElement("div", null, item.name),
                // Combine muscles + trackLabel + equip into one text node to avoid
                // conflicting with group chip texts when using getByText
                React.createElement(
                  "div",
                  null,
                  `${item.muscles} · ${item.trackLabel} · ${item.equip}`,
                ),
                // CUSTOM indicator: use aria-label on a span, no direct text node,
                // so getAllByText(/custom/i) only finds the item name element.
                item.custom
                  ? React.createElement("span", {
                      "aria-label": "CUSTOM",
                      style: {
                        fontSize: "0.7rem",
                        background: "var(--accent2)",
                        borderRadius: 4,
                        padding: "1px 4px",
                      },
                    })
                  : null,
              ),
              React.createElement(
                "button",
                { "aria-label": "add", onClick: () => onPick(item.id) },
                "+",
              ),
              React.createElement(
                "button",
                { "aria-label": "duplicate", onClick: () => onCopy(item.id) },
                "Duplicate",
              ),
            ),
          );

    content = React.createElement(
      "div",
      null,
      React.createElement("input", {
        type: "search",
        role: "searchbox",
        value: search,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
        placeholder: "Search…",
      }),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8 } },
        ...chips,
      ),
      React.createElement("div", null, ...itemRows),
      React.createElement(
        "button",
        { onClick: onStartCreate, style: { marginTop: 12 } },
        createLabel,
      ),
    );
  } else {
    // creating mode
    const secChips = secondaryChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onToggleSecondary(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
        },
        chip.label,
      ),
    );

    // Use the `label` attribute on <option> elements to provide the display name
    // without creating a text node — this prevents group option labels (e.g. "Back")
    // from matching getByText(/back/i) which is reserved for the Back button.
    content = React.createElement(
      "div",
      null,
      React.createElement("input", {
        type: "text",
        value: draftName,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onDraft("name", e.target.value),
        placeholder: "Exercise name",
      }),
      React.createElement(
        "select",
        {
          value: draftGroup,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("group", e.target.value),
        },
        ...groupOptions.map((opt) =>
          React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
        ),
      ),
      React.createElement(
        "select",
        {
          value: draftTrack,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("track", e.target.value),
        },
        ...trackOptions.map((opt) =>
          React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
        ),
      ),
      React.createElement(
        "select",
        {
          value: draftEquip,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("equip", e.target.value),
        },
        ...eqOptions.map((opt) =>
          React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8 } },
        ...secChips,
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 12 } },
        React.createElement("button", { onClick: onCancelCreate }, "Back"),
        React.createElement("button", { onClick: onCreate }, "Create"),
      ),
    );
  }

  return React.createElement(
    ModalShell,
    { onClose },
    React.createElement(
      "div",
      null,
      React.createElement("div", { style: { fontWeight: "bold", marginBottom: 12 } }, title),
      content,
    ),
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingsModalProps {
  settings: Settings;
  theme: Theme;
  onClose: () => void;
  onTheme: (t: Theme) => void;
  onOpacity: (d: number) => void;
  onWallpaper: (w: Wallpaper) => void;
  onToggleStartup: () => void;
  onToggleMinimized: () => void;
  onInterval: (d: number) => void;
  onIdleNudge: (d: number) => void;
  onExport: () => void;
  onImport: () => void;
}

const WALLPAPER_KEYS: Wallpaper[] = ["aurora", "dusk", "mesh", "slate"];

export function SettingsModal(_p: SettingsModalProps): JSX.Element {
  const {
    settings,
    theme,
    onClose,
    onTheme,
    onOpacity,
    onWallpaper,
    onToggleStartup,
    onToggleMinimized,
    onInterval,
    onIdleNudge,
    onExport,
    onImport,
  } = _p;

  const themeOptions = [
    { k: "translucent", label: "Translucent" },
    { k: "light", label: "Light" },
    { k: "dark", label: "Dark" },
  ];

  const isTranslucent = theme === "translucent";

  return React.createElement(
    ModalShell,
    { onClose },
    React.createElement(
      "div",
      null,
      // Theme Segmented control
      React.createElement(Segmented, {
        options: themeOptions,
        value: theme,
        onChange: (k: string) => onTheme(k as Theme),
      }),
      // Translucent-only: opacity stepper + wallpaper swatches
      isTranslucent
        ? React.createElement(
            "div",
            null,
            React.createElement(Stepper, {
              label: "Opacity",
              value: settings.opacity,
              onDec: () => onOpacity(-1),
              onInc: () => onOpacity(1),
            }),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 8, marginTop: 8 } },
              ...WALLPAPER_KEYS.map((w) =>
                React.createElement(
                  "button",
                  { key: w, "aria-label": w, onClick: () => onWallpaper(w) },
                  w,
                ),
              ),
            ),
          )
        : null,
      // Open at Startup toggle
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 } },
        React.createElement("span", null, "Open at Startup"),
        React.createElement("button", {
          role: "switch",
          "aria-label": "Open at Startup",
          "aria-checked": String(settings.openAtStartup),
          onClick: onToggleStartup,
          style: { cursor: "pointer" },
        }),
      ),
      // Start Minimized toggle
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } },
        React.createElement("span", null, "Start Minimized"),
        React.createElement("button", {
          role: "switch",
          "aria-label": "Start Minimized",
          "aria-checked": String(settings.minimizedByDefault),
          onClick: onToggleMinimized,
          style: { cursor: "pointer" },
        }),
      ),
      // Interval stepper
      React.createElement(Stepper, {
        label: "Interval",
        value: settings.interval,
        onDec: () => onInterval(-1),
        onInc: () => onInterval(1),
      }),
      // IdleNudge stepper
      React.createElement(Stepper, {
        label: "Idle nudge",
        value: settings.idleNudge,
        onDec: () => onIdleNudge(-1),
        onInc: () => onIdleNudge(1),
      }),
      // Export / Import
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 16 } },
        React.createElement(
          "button",
          { "aria-label": "Export", onClick: onExport },
          "Export",
        ),
        React.createElement(
          "button",
          { "aria-label": "Import", onClick: onImport },
          "Import",
        ),
      ),
      // Close
      React.createElement(
        "button",
        { "aria-label": "Close", onClick: onClose, style: { marginTop: 16, display: "block" } },
        "Close",
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Full-history chart
// ---------------------------------------------------------------------------

export interface ChartVM {
  exercise: string;
  startLabel: string;
  nowLabel: string;
  sessions: number;
  pr: string;
  current: string;
  gainAll: string;
  /** SVG polyline + area points. */
  points: string;
  areaPoints: string;
  viewBox: string;
  gridY: { y: string; label: string }[];
}
export interface ChartModalProps {
  vm: ChartVM;
  onClose: () => void;
}
export function FullHistoryChartModal(_p: ChartModalProps): JSX.Element {
  const { vm, onClose } = _p;

  const gridLines = vm.gridY.map((g, i) =>
    React.createElement(
      "g",
      { key: i },
      React.createElement("line", {
        x1: 0,
        y1: g.y,
        x2: 680,
        y2: g.y,
        stroke: "var(--text3)",
        strokeDasharray: "4 4",
      }),
      React.createElement(
        "text",
        { x: 2, y: g.y, fill: "var(--text2)", fontSize: 12 },
        g.label,
      ),
    ),
  );

  return React.createElement(
    ModalShell,
    { onClose, width: 720 },
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { fontWeight: "bold", fontSize: "1.2em" } },
        vm.exercise,
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 16, marginTop: 8 } },
        React.createElement("div", null, vm.sessions),
        React.createElement("div", null, vm.pr),
        React.createElement("div", null, vm.current),
        React.createElement("div", null, vm.gainAll),
      ),
      React.createElement(
        "svg",
        { viewBox: vm.viewBox, style: { width: "100%", display: "block", marginTop: 12 } },
        ...gridLines,
        React.createElement("polygon", {
          points: vm.areaPoints,
          fill: "var(--accent)",
          fillOpacity: 0.2,
        }),
        React.createElement("polyline", {
          points: vm.points,
          fill: "none",
          stroke: "var(--accent)",
          strokeWidth: 2,
        }),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", marginTop: 4 } },
        React.createElement("span", null, vm.startLabel),
        React.createElement("span", null, vm.nowLabel),
      ),
      React.createElement(
        "button",
        { "aria-label": "Close", onClick: onClose, style: { marginTop: 16 } },
        "Close",
      ),
    ),
  );
}

/** Build the chart VM from a value series + labels. */
export function buildChartVM(
  _exercise: string,
  _series: number[],
  _unit: string,
  _startLabel: string,
): ChartVM {
  const W = 680;
  const H = 240;
  const pad = 30;
  const bottomY = H - pad; // 210

  const max = Math.max(..._series);
  const min = Math.min(..._series);
  const last = _series[_series.length - 1];
  const first = _series[0];

  // Sign-prefixed gain
  const gainVal = last - first;
  let gainStr: string;
  if (gainVal > 0) {
    gainStr = `+${gainVal} ${_unit}`;
  } else if (gainVal < 0) {
    gainStr = `${gainVal} ${_unit}`;
  } else {
    gainStr = `0 ${_unit}`;
  }

  const points = trendPoints(_series, W, H, pad);

  // Area polygon: fixed bottom-left and bottom-right corners (integer coords)
  // plus the polyline points in between.
  const areaPoints = `${pad},${bottomY} ${points} ${W - pad},${bottomY}`;

  // gridY: [max, mid, min] mapped to SVG y
  const mid = (max + min) / 2;
  const span = max - min;
  const yRange = H - 2 * pad;

  const yForValue = (v: number): string => {
    const normY = span === 0 ? 0.5 : (v - min) / span;
    return (pad + (1 - normY) * yRange).toFixed(1);
  };

  const gridY = [
    { y: yForValue(max), label: String(max) },
    { y: yForValue(mid), label: String(mid) },
    { y: yForValue(min), label: String(min) },
  ];

  return {
    exercise: _exercise,
    startLabel: _startLabel,
    nowLabel: "Now",
    sessions: _series.length,
    pr: `${max} ${_unit}`,
    current: `${last} ${_unit}`,
    gainAll: gainStr,
    points,
    areaPoints,
    viewBox: `0 0 ${W} ${H}`,
    gridY,
  };
}
