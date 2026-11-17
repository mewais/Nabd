import { Card, Segmented } from "@nabd/design-system";
import { CalendarView } from "./calendar-view";
import { PROGRESS_TAB_OPTIONS } from "./options";
import type { ProgressActions } from "./progress-actions";
import type { ConsistencyVM } from "./consistency-vm";
import { WeeklyView } from "./weekly-view";
import { WORDS } from "./wording";

interface ConsistencyCardProps {
  vm: ConsistencyVM;
  actions: Pick<ProgressActions, "setTab">;
}

/** How regularly sets get logged: this month day by day, or the last weeks as bars. */
export function ConsistencyCard({ vm, actions }: ConsistencyCardProps): JSX.Element {
  return (
    <Card
      title={WORDS.consistency}
      action={
        <Segmented
          options={PROGRESS_TAB_OPTIONS}
          value={vm.tab}
          onChange={actions.setTab}
          size="sm"
          ariaLabel={WORDS.consistencyView}
        />
      }
    >
      {vm.tab === "calendar" ? <CalendarView vm={vm.calendar} /> : <WeeklyView vm={vm.weekly} />}
    </Card>
  );
}
