import { Card, ProgressRing, Row } from "@nabd/design-system";
import type { DayProgressVM } from "./shell-vm";

interface DayProgressRingProps {
  vm: DayProgressVM;
}

/** Today's sets as a ring that fills as they get done. */
export function DayProgressRing({ vm }: DayProgressRingProps): JSX.Element {
  const { done, totalLabel, pct, ariaLabel } = vm;
  return (
    <Card variant="inset" padding="lg">
      <Row justify="center">
        <ProgressRing pct={pct} value={done} caption={totalLabel} ariaLabel={ariaLabel} />
      </Row>
    </Card>
  );
}
