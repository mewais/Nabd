import { BarChart, TEXT } from "@nabd/design-system";
import type { BarDatum } from "@nabd/design-system";

interface WeeklyViewProps {
  vm: readonly BarDatum[];
}

/** Sets per week as bars, the current week last. */
export function WeeklyView({ vm }: WeeklyViewProps): JSX.Element {
  return (
    <div>
      <div style={{ ...TEXT.caption, marginBottom: 14 }}>Sets per week · last 8 weeks</div>
      <BarChart bars={vm} height={160} ariaLabel="Sets per week" />
    </div>
  );
}
