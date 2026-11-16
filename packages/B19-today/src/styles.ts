import type { CSSProperties } from "react";

export const MONO: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export const CARD_STYLE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  boxShadow: "var(--cardshadow)",
};

export const SECTION_TITLE: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};
