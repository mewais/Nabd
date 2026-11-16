import React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Equipment, Settings, Theme, WeightUnit } from "@nabd/domain";
import { EQUIPMENT_KEYS, EQUIPMENT_NAMES, formatMinuteOfDay } from "@nabd/domain";
import { Button, Icon, Segmented, Stepper, Toggle } from "@nabd/design-system";
import { CloseButton, EYEBROW, ModalShell, chipStyle } from "./modal-shell";

export interface SettingsModalProps {
  settings: Settings;
  /** The outcome of the last import/export, if any. */
  notice: { kind: "info" | "error"; text: string } | null;
  /** Apply a change; out-of-range values are ignored by the store. */
  onChange: (patch: Partial<Settings>) => void;
  onExport: () => void;
  onImport: () => void;
  onClose: () => void;
  /** Whether this platform can make the window translucent; if not, its rows are hidden. */
  glassAvailable: boolean;
  /** Raise a sample OS notification. */
  onTestNotification: () => void;
  /** Exit the app (closing the window only hides it while there is a tray). */
  onQuit: () => void;
}

const THEME_OPTIONS = [
  { k: "light", label: "Light" },
  { k: "dark", label: "Dark" },
];
const UNIT_OPTIONS = [
  { k: "kg", label: "kg" },
  { k: "lb", label: "lb" },
];

const ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "9px 0",
};

const DATA_BUTTON: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "var(--surface2)",
  border: "1px solid var(--line)",
  borderRadius: 11,
  padding: 12,
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "inherit",
  color: "var(--text)",
  cursor: "pointer",
};

function Section(p: { title: string; children?: ReactNode }): JSX.Element {
  return React.createElement(
    "div",
    null,
    React.createElement("div", { style: { ...EYEBROW, fontSize: 11, marginBottom: 6 } }, p.title),
    p.children,
  );
}

/** A labelled setting: title + one-line description on the left, the control on the right. */
function Row(p: { title: string; hint: string; children?: ReactNode }): JSX.Element {
  return React.createElement(
    "div",
    { "data-setting": p.title, style: ROW },
    React.createElement(
      "div",
      null,
      React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, p.title),
      React.createElement(
        "div",
        { style: { fontSize: 11.5, color: "var(--text3)", marginTop: 2 } },
        p.hint,
      ),
    ),
    p.children,
  );
}

export function SettingsModal(p: SettingsModalProps): JSX.Element {
  const { settings, onChange, glassAvailable } = p;

  /** A +/- control over one numeric setting. */
  const stepper = (key: NumericSetting, step: number, show: (value: number) => string) =>
    React.createElement(Stepper, {
      value: show(settings[key]),
      onDec: () => onChange({ [key]: round(settings[key] - step) }),
      onInc: () => onChange({ [key]: round(settings[key] + step) }),
    });
  const toggle = (key: BooleanSetting) =>
    React.createElement(Toggle, {
      on: settings[key],
      onChange: () => onChange({ [key]: !settings[key] }),
    });
  const owned = new Set(settings.equipment);
  const toggleEquipment = (key: Equipment): void =>
    onChange({
      equipment: owned.has(key)
        ? settings.equipment.filter((e) => e !== key)
        : [...settings.equipment, key],
    });

  return React.createElement(
    ModalShell,
    { onClose: p.onClose, zIndex: 90, panelStyle: { width: 540, overflowY: "auto" } },
    React.createElement(
      "div",
      {
        style: {
          position: "sticky",
          top: 0,
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 22px 14px",
          borderBottom: "1px solid var(--line)",
          zIndex: 2,
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" } },
        "Settings",
      ),
      React.createElement(CloseButton, { onClose: p.onClose }),
    ),
    React.createElement(
      "div",
      { style: { padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 22 } },

      React.createElement(
        Section,
        { title: "WORKDAY" },
        React.createElement(
          Row,
          { title: "Starts", hint: "Nabd stays silent before this." },
          stepper("workStart", 30, formatMinuteOfDay),
        ),
        React.createElement(
          Row,
          { title: "Ends", hint: "…and after this." },
          stepper("workEnd", 30, formatMinuteOfDay),
        ),
      ),

      React.createElement(
        Section,
        { title: "NUDGES" },
        React.createElement(
          Row,
          { title: "Interval", hint: "Nudge this long after your last set, no matter what." },
          stepper("interval", 5, (v) => `${v} min`),
        ),
        React.createElement(
          Row,
          { title: "Minimum gap", hint: "Never nudge sooner than this after a set." },
          stepper("minGap", 5, (v) => `${v} min`),
        ),
        React.createElement(
          Row,
          {
            title: "Idle moment",
            hint: "Once the minimum gap has passed, this long without keyboard or mouse nudges early.",
          },
          stepper("idleNudge", 5, (v) => `${v} sec`),
        ),
        React.createElement(
          Row,
          {
            title: "Notifications",
            hint: "A set due while Nabd is in the background is announced by your desktop.",
          },
          React.createElement(
            Button,
            { variant: "ghost", onClick: p.onTestNotification },
            "Send test notification",
          ),
        ),
      ),

      React.createElement(
        Section,
        { title: "TRAINING" },
        React.createElement(
          Row,
          { title: "Weight unit", hint: "Show and enter weights in this unit." },
          React.createElement(Segmented, {
            options: UNIT_OPTIONS,
            value: settings.weightUnit,
            onChange: (k: string) => onChange({ weightUnit: k as WeightUnit }),
          }),
        ),
        React.createElement(
          Row,
          {
            title: "Weight increment",
            hint: "The smallest jump you can load; suggestions use it.",
          },
          stepper("weightIncrement", 0.25, (v) => `${v} ${settings.weightUnit}`),
        ),
        React.createElement(
          "div",
          { style: { padding: "9px 0" } },
          React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, "My equipment"),
          React.createElement(
            "div",
            { style: { fontSize: 11.5, color: "var(--text3)", margin: "2px 0 9px" } },
            "The exercise library only offers what you can do with these.",
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            ...EQUIPMENT_KEYS.map((key) =>
              React.createElement(
                "button",
                {
                  key,
                  onClick: () => toggleEquipment(key),
                  "aria-pressed": owned.has(key),
                  style: chipStyle(owned.has(key)),
                },
                EQUIPMENT_NAMES[key],
              ),
            ),
          ),
        ),
      ),

      React.createElement(
        Section,
        { title: "APPEARANCE" },
        React.createElement(
          Row,
          { title: "Theme", hint: "Sets text & contrast." },
          React.createElement(Segmented, {
            options: THEME_OPTIONS,
            value: settings.theme,
            onChange: (k: string) => onChange({ theme: k as Theme }),
          }),
        ),
        glassAvailable
          ? React.createElement(
              Row,
              {
                title: "Translucent window",
                hint: "Frost the panels so your desktop shows through.",
              },
              toggle("glass"),
            )
          : null,
        glassAvailable && settings.glass
          ? React.createElement(
              Row,
              { title: "Background opacity", hint: "Higher = more solid." },
              stepper("opacity", 0.05, (v) => `${Math.round(v * 100)}%`),
            )
          : null,
      ),

      React.createElement(
        Section,
        { title: "STARTUP" },
        React.createElement(
          Row,
          { title: "Open at startup", hint: "Launch Nabd when you log in." },
          toggle("openAtStartup"),
        ),
        React.createElement(
          Row,
          { title: "Start minimized", hint: "Sit quietly in the tray until a set is due." },
          toggle("minimizedByDefault"),
        ),
      ),

      React.createElement(
        Section,
        { title: "DATA" },
        React.createElement(
          "div",
          { style: { display: "flex", gap: 10, paddingTop: 6 } },
          React.createElement(
            Button,
            { variant: "ghost", onClick: p.onExport, style: DATA_BUTTON },
            React.createElement(Icon, { name: "download", size: 15 }),
            "Export data",
          ),
          React.createElement(
            Button,
            { variant: "ghost", onClick: p.onImport, style: DATA_BUTTON },
            React.createElement(Icon, { name: "upload", size: 15 }),
            "Import data",
          ),
        ),
        p.notice !== null
          ? React.createElement(
              "div",
              {
                role: "status",
                style: {
                  marginTop: 10,
                  fontSize: 12.5,
                  color: p.notice.kind === "error" ? "var(--accent)" : "var(--text2)",
                  wordBreak: "break-word",
                },
              },
              p.notice.text,
            )
          : null,
      ),

      React.createElement(
        Button,
        { variant: "ghost", onClick: p.onQuit, style: DATA_BUTTON },
        "Quit Nabd",
      ),
    ),
  );
}

type NumericSetting = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];
type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

/** Keep stepped decimals (0.05, 0.5) free of floating-point dust. */
const round = (value: number): number => Math.round(value * 100) / 100;
