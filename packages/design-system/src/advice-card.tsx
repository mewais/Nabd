import type { CSSProperties } from "react";
import type { AdviceChoice } from "@nabd/domain";
import { Icon } from "./icon";
import { COLOR, RADIUS, SURFACE2_BOX, TEXT } from "./tokens";

/** A suggestion in words. */
export interface AdviceText {
  /** The headline target: "9 × 25 lb". */
  primary: string;
  /** The other way forward, when there is one. */
  alternative: string | null;
  /** Why, in a sentence. */
  reason: string;
  /** What it was compared against, when there is history. */
  basis: string | null;
}

export interface AdviceCardProps {
  advice: AdviceText;
  /** When given, each target becomes a button that applies it. */
  onApply?: (which: AdviceChoice) => void;
}

const TARGET: CSSProperties = {
  ...TEXT.monoValue,
  fontWeight: 700,
  fontSize: 13.5,
  color: "var(--text)",
  background: "transparent",
  border: "none",
  padding: 0,
};

const APPLY: CSSProperties = {
  ...TARGET,
  cursor: "pointer",
  textDecoration: "underline dotted",
  textUnderlineOffset: 3,
};

/** The coach's suggestion: a target, an optional alternative, and the reasoning. */
export function AdviceCard({ advice, onApply }: AdviceCardProps): JSX.Element {
  const target = (which: AdviceChoice, text: string): JSX.Element =>
    onApply ? (
      <button type="button" title="Use this" onClick={() => onApply(which)} style={APPLY}>
        {text}
      </button>
    ) : (
      <b style={TARGET}>{text}</b>
    );

  return (
    <div
      style={{
        ...SURFACE2_BOX,
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderRadius: RADIUS.button,
        padding: "12px 15px",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: RADIUS.chip,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="bolt" size={15} stroke={COLOR.onAccent} />
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.45 }}>
        <div>
          Try {target("primary", advice.primary)}
          {advice.alternative !== null && <> or {target("alternative", advice.alternative)}</>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)" }}>
          {[advice.basis, advice.reason].filter((line) => line !== null).join(" · ")}
        </div>
      </div>
    </div>
  );
}
