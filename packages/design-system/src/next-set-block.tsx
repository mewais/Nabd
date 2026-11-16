import type { CSSProperties } from "react";
import type { AdviceChoice } from "@nabd/view";
import { AdviceCard } from "./advice-card";
import type { AdviceText } from "./advice-card";
import { Chip } from "./chip";
import { FONT, TEXT } from "./tokens";

interface NextSetBlockProps {
  exercise: string;
  /** What the set is, under the name: "Working set · 8–12 reps"; null when there is nothing to say. */
  line: string | null;
  /** The muscles worked, primary ones first. */
  muscleNames: readonly string[];
  /** The plan's note on the exercise; empty when there is none. */
  notes: string;
  /** Null for a set that is not something to progress on. */
  advice: AdviceText | null;
  /** When given, the advice's targets can be applied. */
  onApplyAdvice?: (which: AdviceChoice) => void;
  /** `hero` (default) as a screen's headline; `form` at the head of a form, where the line is the accent. */
  variant?: "hero" | "form";
}

const TITLE: Record<NonNullable<NextSetBlockProps["variant"]>, CSSProperties> = {
  hero: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: 0 },
  form: { ...TEXT.title, fontSize: 24, margin: 0 },
};

const LINE: Record<NonNullable<NextSetBlockProps["variant"]>, CSSProperties> = {
  hero: { fontFamily: FONT.mono, fontSize: 13, color: "var(--text2)" },
  form: { fontFamily: FONT.mono, fontSize: 12.5, color: "var(--accent)" },
};

/**
 * The set that comes next: the exercise, what the plan asks for, the muscles
 * it works, the plan's note and the coach's advice.
 */
export function NextSetBlock({
  exercise,
  line,
  muscleNames,
  notes,
  advice,
  onApplyAdvice,
  variant = "hero",
}: NextSetBlockProps): JSX.Element {
  const hero = variant === "hero";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: hero ? 16 : 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: hero ? 16 : 4 }}>
        <h3 style={TITLE[variant]}>{exercise}</h3>
        {line !== null && <div style={LINE[variant]}>{line}</div>}
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {muscleNames.map((name) => (
          <Chip key={name}>{name}</Chip>
        ))}
      </div>
      {notes !== "" && <div style={TEXT.note}>{notes}</div>}
      {advice !== null && <AdviceCard advice={advice} onApply={onApplyAdvice} />}
    </div>
  );
}
