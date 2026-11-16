import { Card, Segmented } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import { CalendarView } from "./calendar-view";
import type { ProgressTab } from "@nabd/domain";
import type { ConsistencyVM } from "./view-model";
import { WeeklyView } from "./weekly-view";

const TABS: readonly SegOption<ProgressTab>[] = [
  { value: "calendar", label: "Calendar" },
  { value: "weekly", label: "Weekly" },
];

interface ConsistencyCardProps {
  consistency: ConsistencyVM;
  onTab: (tab: ProgressTab) => void;
}

/** How regularly sets get logged: this month day by day, or the last weeks as bars. */
export function ConsistencyCard({ consistency, onTab }: ConsistencyCardProps): JSX.Element {
  return (
    <Card
      title="Consistency"
      action={
        <Segmented
          options={TABS}
          value={consistency.tab}
          onChange={onTab}
          size="sm"
          ariaLabel="Consistency view"
        />
      }
      stacked
    >
      {consistency.tab === "calendar" ? (
        <CalendarView calendar={consistency.calendar} />
      ) : (
        <WeeklyView weekly={consistency.weekly} />
      )}
    </Card>
  );
}
