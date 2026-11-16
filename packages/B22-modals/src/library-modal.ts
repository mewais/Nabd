import React from "react";
import type { ReactNode } from "react";
import type { Equipment, TrackingType } from "@nabd/domain";
import { EQUIPMENT_KEYS, EQUIPMENT_NAMES, TRACKING_KEYS, TRACK_NAMES } from "@nabd/domain";
import { Dropdown } from "@nabd/design-system";
import { CloseButton, ModalShell, chipStyle } from "./modal-shell";

const TRACK_OPTIONS = TRACKING_KEYS.map((k) => ({ k, label: TRACK_NAMES[k] }));
const EQUIPMENT_OPTIONS = EQUIPMENT_KEYS.map((k) => ({ k, label: EQUIPMENT_NAMES[k] }));

export interface LibraryItem {
  id: string;
  name: string;
  muscles: string;
  trackLabel: string;
  equip: string;
  custom: boolean;
}
export interface LibraryModalProps {
  title: string;
  creating: boolean;
  search: string;
  groupChips: { k: string; label: string; active: boolean }[];
  items: LibraryItem[];
  emptyMsg: string;
  // custom-exercise form (shown while `creating`)
  draftName: string;
  draftTrack: TrackingType;
  draftEquip: Equipment;
  primaryChips: { k: string; label: string; active: boolean }[];
  secondaryChips: { k: string; label: string; active: boolean }[];
  onClose: () => void;
  onSearch: (q: string) => void;
  onGroup: (g: string) => void;
  onPick: (exId: string) => void;
  onCopy: (exId: string) => void;
  onDeleteCustom: (exId: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onDraftName: (name: string) => void;
  onDraftTrack: (tracking: TrackingType) => void;
  onDraftEquip: (equipment: Equipment) => void;
  onTogglePrimary: (m: string) => void;
  onToggleSecondary: (m: string) => void;
  onCreate: () => void;
}

export function LibraryModal(_p: LibraryModalProps): JSX.Element {
  const {
    title,
    creating,
    search,
    groupChips,
    items,
    emptyMsg,
    draftName,
    draftTrack,
    draftEquip,
    primaryChips,
    secondaryChips,
    onClose,
    onSearch,
    onGroup,
    onPick,
    onCopy,
    onDeleteCustom,
    onStartCreate,
    onCancelCreate,
    onDraftName,
    onDraftTrack,
    onDraftEquip,
    onTogglePrimary,
    onToggleSecondary,
    onCreate,
  } = _p;

  // browsing: fixed sub-header (search + chips) + scrollable list; creating: scrollable form
  let fixedSubHeader: ReactNode = null;
  let content: ReactNode;

  if (!creating) {
    // Group filter chips
    const chips = groupChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onGroup(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
          style: chipStyle(chip.active),
        },
        chip.label,
      ),
    );

    // Fixed sub-header: search input + group filter chips (does not scroll)
    fixedSubHeader = React.createElement(
      "div",
      {
        style: {
          padding: "12px 20px 0",
          flexShrink: 0,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 12,
        },
      },
      React.createElement("input", {
        type: "search",
        role: "searchbox",
        value: search,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
        placeholder: "Search exercises…",
        style: {
          width: "100%",
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "11px 13px",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--text)",
          outline: "none",
          boxSizing: "border-box" as const,
        },
      }),
      React.createElement(
        "div",
        { style: { paddingTop: 10, display: "flex", gap: 7, flexWrap: "wrap" as const } },
        ...chips,
      ),
    );

    // Items list
    const itemRows =
      items.length === 0
        ? [
            React.createElement(
              "div",
              {
                key: "empty",
                style: {
                  fontSize: 12.5,
                  color: "var(--text3)",
                  textAlign: "center" as const,
                  padding: "14px 18px 6px",
                },
              },
              emptyMsg,
            ),
          ]
        : items.map((item) =>
            React.createElement(
              "div",
              {
                key: item.id,
                style: { display: "flex", alignItems: "stretch", gap: 7 },
              },
              React.createElement(
                "button",
                {
                  "aria-label": "add",
                  onClick: () => onPick(item.id),
                  style: {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left" as const,
                    background: "var(--surface2)",
                    border: "1px solid var(--line)",
                    borderRadius: 11,
                    padding: "12px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--text)",
                  },
                },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      },
                    },
                    item.name,
                    item.custom
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 9,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: "var(--accent)",
                              border: "1px solid var(--accent)",
                              borderRadius: 5,
                              padding: "1px 5px",
                              letterSpacing: ".04em",
                            },
                          },
                          "CUSTOM",
                        )
                      : null,
                  ),
                  React.createElement(
                    "div",
                    { style: { fontSize: 11, color: "var(--text3)", marginTop: 2 } },
                    `${item.muscles} · ${item.trackLabel} · ${item.equip}`,
                  ),
                ),
                React.createElement(
                  "span",
                  {
                    style: { color: "var(--accent)", fontSize: 18, fontWeight: 700, flexShrink: 0 },
                  },
                  "+",
                ),
              ),
              React.createElement(
                "button",
                {
                  "aria-label": "duplicate",
                  onClick: () => onCopy(item.id),
                  title: "Duplicate & edit",
                  style: {
                    flexShrink: 0,
                    width: 42,
                    background: "var(--surface2)",
                    border: "1px solid var(--line)",
                    borderRadius: 11,
                    cursor: "pointer",
                    color: "var(--text3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                React.createElement(
                  "svg",
                  {
                    width: 15,
                    height: 15,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.8",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  React.createElement("rect", { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
                  React.createElement("path", { d: "M5 15V5a2 2 0 0 1 2-2h10" }),
                ),
              ),
              item.custom
                ? React.createElement(
                    "button",
                    {
                      "aria-label": "delete",
                      onClick: () => onDeleteCustom(item.id),
                      title: "Delete custom exercise",
                      style: {
                        flexShrink: 0,
                        width: 42,
                        background: "var(--surface2)",
                        border: "1px solid var(--line)",
                        borderRadius: 11,
                        cursor: "pointer",
                        color: "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    },
                    React.createElement(
                      "svg",
                      {
                        width: 15,
                        height: 15,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "#e05252",
                        strokeWidth: "1.8",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      React.createElement("polyline", { points: "3 6 5 6 21 6" }),
                      React.createElement("path", {
                        d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
                      }),
                      React.createElement("path", { d: "M10 11v6" }),
                      React.createElement("path", { d: "M14 11v6" }),
                      React.createElement("path", {
                        d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
                      }),
                    ),
                  )
                : null,
            ),
          );

    // Scrollable content: exercise item list + "create custom" button
    content = React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px 16px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 7,
        },
      },
      ...itemRows,
      React.createElement(
        "button",
        {
          onClick: onStartCreate,
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "none",
            border: "1.5px dashed var(--accent)",
            borderRadius: 11,
            padding: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            color: "var(--accent)",
            fontSize: 13.5,
            fontWeight: 700,
            marginTop: 4,
          },
        },
        "Create custom exercise",
      ),
    );
  } else {
    // creating mode
    const noPrimary = primaryChips.every((c) => !c.active);

    const primChips = primaryChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onTogglePrimary(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
          style: chipStyle(chip.active),
        },
        chip.label,
      ),
    );

    const secChips = secondaryChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onToggleSecondary(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
          style: chipStyle(chip.active),
        },
        chip.label,
      ),
    );

    const inputStyle: React.CSSProperties = {
      width: "100%",
      background: "var(--surface2)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "12px 13px",
      fontSize: 14,
      fontFamily: "inherit",
      color: "var(--text)",
      outline: "none",
      boxSizing: "border-box" as const,
    };

    const labelStyle: React.CSSProperties = {
      fontSize: 10,
      color: "var(--text3)",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: ".08em",
      marginBottom: 7,
    };

    content = React.createElement(
      "div",
      {
        style: {
          padding: "18px 18px 20px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 16,
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "EXERCISE NAME"),
        React.createElement("input", {
          type: "text",
          value: draftName,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onDraftName(e.target.value),
          placeholder: "Exercise name",
          style: inputStyle,
        }),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "PRIMARY MUSCLES"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" as const } },
          ...primChips,
        ),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "HOW TO TRACK IT"),
        React.createElement(Dropdown, {
          value: draftTrack,
          options: TRACK_OPTIONS,
          onChange: (k: string) => onDraftTrack(k as TrackingType),
          ariaLabel: "HOW TO TRACK IT",
        }),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "EQUIPMENT"),
        React.createElement(Dropdown, {
          value: draftEquip,
          options: EQUIPMENT_OPTIONS,
          onChange: (k: string) => onDraftEquip(k as Equipment),
          ariaLabel: "EQUIPMENT",
        }),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "SECONDARY MUSCLES"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" as const } },
          ...secChips,
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 10, marginTop: 4 } },
        React.createElement(
          "button",
          {
            onClick: noPrimary ? undefined : onCreate,
            disabled: noPrimary,
            style: {
              flex: 1,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 11,
              padding: 13,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: noPrimary ? "not-allowed" : "pointer",
              opacity: noPrimary ? 0.5 : 1,
            },
          },
          "Create",
        ),
        React.createElement(
          "button",
          {
            onClick: onCancelCreate,
            style: {
              background: "transparent",
              color: "var(--text2)",
              border: "1px solid var(--line)",
              borderRadius: 11,
              padding: "13px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            },
          },
          "Back",
        ),
      ),
    );
  }

  // Scrollable content area: browsing mode has search + chips + list; creating has the form.
  // Both use overflowY:"auto" with flex:1/minHeight:0 so they scroll inside the fixed-height panel.
  const scrollContent = !creating
    ? React.createElement(
        "div",
        {
          "data-library-scroll": true,
          style: {
            flex: 1,
            minHeight: 0,
            overflowY: "auto" as const,
            display: "flex",
            flexDirection: "column" as const,
          },
        },
        content,
      )
    : React.createElement(
        "div",
        {
          "data-library-scroll": true,
          style: {
            flex: 1,
            minHeight: 0,
            overflowY: "auto" as const,
          },
        },
        content,
      );

  return React.createElement(
    ModalShell,
    {
      onClose,
      zIndex: 80,
      panelStyle: {
        width: 560,
        height: 680,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    },
    // Fixed header: title + close button only (does not scroll)
    React.createElement(
      "div",
      {
        style: {
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        React.createElement("div", { style: { fontWeight: "bold" } }, title),
        React.createElement(CloseButton, { onClose }),
      ),
    ),
    // Fixed sub-header (browsing only): search input + group filter chips
    fixedSubHeader,
    // Scrollable region: exercise item list + "create custom" button (browsing) or form (creating)
    scrollContent,
  );
}
