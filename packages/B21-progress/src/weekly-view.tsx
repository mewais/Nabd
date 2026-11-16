import { BarChart } from "@nabd/design-system";
import type { BarDatum } from "@nabd/design-system";
import { CHART_CAPTION } from "./styles";

/** Sets per week as bars, the current week last. */
export function WeeklyView({ weekly }: { weekly: readonly BarDatum[] }): JSX.Element {
  return (
    <div>
      <div style={{ ...CHART_CAPTION, marginBottom: 14 }}>Sets per week · last 8 weeks</div>
      <BarChart bars={weekly} height={160} ariaLabel="Sets per week" />
    </div>
  );
}
