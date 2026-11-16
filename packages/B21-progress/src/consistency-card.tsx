import { Card, Segmented } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import { CalendarView } from "./calendar-view";
import { STACKED_CARD } from "./styles";
import type { ConsistencyTab, ProgressVM } from "./view-model";
import { WeeklyView } from "./weekly-view";

const TABS: readonly SegOption<ConsistencyTab>[] = [
  { k: "calendar", label: "Calendar" },
  { k: "weekly", label: "Weekly" },
];

export interface ConsistencyCardProps {
  consistency: ProgressVM["consistency"];
  tab: ConsistencyTab;
  onTab: (tab: ConsistencyTab) => void;
}

/** How regularly sets get logged: this month day by day, or the last weeks as bars. */
export function ConsistencyCard({ consistency, tab, onTab }: ConsistencyCardProps): JSX.Element {
  return (
    <Card
      title="Consistency"
      action={
        <Segmented
          options={TABS}
          value={tab}
          onChange={onTab}
          size="sm"
          ariaLabel="Consistency view"
        />
      }
      style={STACKED_CARD}
    >
      {tab === "calendar" ? (
        <CalendarView calendar={consistency.calendar} />
      ) : (
        <WeeklyView weekly={consistency.weekly} />
      )}
    </Card>
  );
}
