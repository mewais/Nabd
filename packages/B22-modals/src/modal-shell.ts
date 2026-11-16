import React from "react";
import type { CSSProperties, ReactNode } from "react";

/** The mono, upper-case micro-label used above titles and sections. */
export const EYEBROW: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".1em",
  color: "var(--text3)",
  fontFamily: "'JetBrains Mono', monospace",
};

/** A selectable chip (filters, muscles, equipment). */
export function chipStyle(active: boolean): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    padding: "5px 12px",
    borderRadius: 8,
    border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
    background: active ? "color-mix(in oklch, var(--accent) 15%, transparent)" : "var(--surface2)",
    color: active ? "var(--accent)" : "var(--text2)",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export interface ModalShellProps {
  onClose: () => void;
  /** Stacking order; a modal opened from another modal needs a higher one. */
  zIndex: number;
  /** Size/layout of the panel, on top of the shared look. */
  panelStyle: CSSProperties;
  children?: ReactNode;
}

/** A dimmed backdrop with a centred panel. Clicking outside the panel closes it. */
export function ModalShell(p: ModalShellProps): JSX.Element {
  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: p.onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: p.zIndex,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        style: {
          maxWidth: "100%",
          maxHeight: "90vh",
          boxSizing: "border-box",
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.3)",
          animation: "nb-fade .22s ease",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          ...p.panelStyle,
        },
      },
      p.children,
    ),
  );
}

/** The square ✕ button in a modal's header. */
export function CloseButton(p: { onClose: () => void }): JSX.Element {
  return React.createElement(
    "button",
    {
      onClick: p.onClose,
      "aria-label": "Close",
      style: {
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text2)",
        flexShrink: 0,
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
        strokeWidth: 2.2,
        strokeLinecap: "round",
      },
      React.createElement("path", { d: "M18 6 6 18M6 6l12 12" }),
    ),
  );
}
