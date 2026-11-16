import type { CSSProperties } from "react";
import type { AdviceChoice } from "@nabd/view";
import { ButtonBase } from "./button-base";
import { Card } from "./card";
import { Icon } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { COLOR, RADIUS, TEXT } from "./tokens";

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

interface AdviceCardProps {
  advice: AdviceText;
  /** When given, each target becomes a button that applies it. */
  onApply?: (which: AdviceChoice) => void;
}

const TARGET: CSSProperties = { ...TEXT.monoValue, fontWeight: 700, color: COLOR.text };
const APPLY: CSSProperties = {
  ...TARGET,
  textDecoration: "underline dotted",
  textUnderlineOffset: 3,
};
const ICON_TILE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  width: 28,
  height: 28,
  borderRadius: RADIUS.chip,
  background: COLOR.accent,
};

/** The coach's suggestion: a target, an optional alternative, and the reasoning. */
export function AdviceCard({ advice, onApply }: AdviceCardProps): JSX.Element {
  const target = (which: AdviceChoice, text: string): JSX.Element =>
    onApply ? (
      <ButtonBase title="Use this" onClick={() => onApply(which)} style={APPLY}>
        {text}
      </ButtonBase>
    ) : (
      <b style={TARGET}>{text}</b>
    );

  return (
    <Card variant="inset" padding="md">
      <Row gap="md">
        <span style={ICON_TILE}>
          <Icon name="bolt" size={15} tone="onAccent" />
        </span>
        <Stack gap="xxs">
          <Text tone="muted">
            Try {target("primary", advice.primary)}
            {advice.alternative !== null && <> or {target("alternative", advice.alternative)}</>}
          </Text>
          <Text variant="hint">
            {[advice.basis, advice.reason].filter((line) => line !== null).join(" · ")}
          </Text>
        </Stack>
      </Row>
    </Card>
  );
}
