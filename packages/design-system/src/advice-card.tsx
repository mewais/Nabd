import type { CSSProperties } from "react";
import type { AdviceWording } from "@nabd/domain";
import type { AdviceChoice } from "@nabd/view";
import { ButtonBase } from "./button-base";
import { Card } from "./card";
import { Icon } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { CENTERED } from "./styles";
import { COLOR, FONT_WEIGHT, RADIUS, TEXT } from "./tokens";

interface AdviceCardProps {
  advice: AdviceWording;
  /** When given, each target becomes a button that applies it. */
  onApply?: (which: AdviceChoice) => void;
}

const TARGET: CSSProperties = {
  ...TEXT.monoValue,
  fontWeight: FONT_WEIGHT.bold,
  color: COLOR.text,
};
const APPLY: CSSProperties = {
  ...TARGET,
  textDecoration: "underline dotted",
  textUnderlineOffset: 3,
};
const ICON_TILE: CSSProperties = {
  ...CENTERED,
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
          <Icon name="bolt" tone="onAccent" />
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
