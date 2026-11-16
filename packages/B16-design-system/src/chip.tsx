import type { ReactNode } from "react";
import { FONT, RADIUS, SURFACE2_BOX } from "./tokens";

export interface ChipProps {
  children?: ReactNode;
  /** `pill` (default): a rounded label. `tag`: a small mono marker such as "CUSTOM". */
  variant?: "pill" | "tag";
  tone?: "neutral" | "accent";
}

/** A static label. For a clickable one use `ChipToggle`. */
export function Chip({ children, variant = "pill", tone = "neutral" }: ChipProps): JSX.Element {
  const accent = tone === "accent";
  if (variant === "tag") {
    return (
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 9.5,
          letterSpacing: ".04em",
          color: accent ? "var(--accent)" : "var(--text3)",
          border: `1px solid ${accent ? "var(--accent)" : "var(--line)"}`,
          borderRadius: RADIUS.tag,
          padding: "3px 7px",
          flex: "none",
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        ...SURFACE2_BOX,
        fontSize: 12,
        color: accent ? "var(--accent)" : "var(--text2)",
        borderRadius: RADIUS.pill,
        padding: "5px 11px",
      }}
    >
      {children}
    </span>
  );
}
