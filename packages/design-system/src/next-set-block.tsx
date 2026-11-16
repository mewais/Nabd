import type { AdviceChoice } from "@nabd/view";
import { AdviceCard } from "./advice-card";
import type { AdviceText } from "./advice-card";
import { Chip } from "./chip";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

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
    <Stack gap={hero ? "lg" : "md"}>
      <Stack gap={hero ? "md" : "xs"}>
        <Text as="h3" variant={hero ? "display" : "headline"}>
          {exercise}
        </Text>
        {line !== null && (
          <Text variant="mono" tone={hero ? "muted" : "accent"}>
            {line}
          </Text>
        )}
      </Stack>
      <Row gap="sm" wrap>
        {muscleNames.map((name) => (
          <Chip key={name}>{name}</Chip>
        ))}
      </Row>
      {notes !== "" && <Text variant="note">{notes}</Text>}
      {advice !== null && <AdviceCard advice={advice} onApply={onApplyAdvice} />}
    </Stack>
  );
}
