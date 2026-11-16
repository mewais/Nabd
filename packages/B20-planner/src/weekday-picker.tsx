import { weekdayInitial, weekdayName } from "@nabd/domain";
import { Segmented } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import { WEEK_ORDER } from "@nabd/program-editor";

export interface WeekdayPickerProps {
  /** 0 = Sunday … 6 = Saturday; null while the day is on no weekday. */
  weekday: number | null;
  onPick: (weekday: number) => void;
}

const OPTIONS: readonly SegOption[] = WEEK_ORDER.map((weekday) => ({
  k: String(weekday),
  label: weekdayInitial(weekday),
  ariaLabel: weekdayName(weekday),
  title: weekdayName(weekday),
}));

/** Monday to Sunday: the weekday a day is trained on. */
export function WeekdayPicker({ weekday, onPick }: WeekdayPickerProps): JSX.Element {
  return (
    <Segmented
      size="sm"
      ariaLabel="Weekday"
      options={OPTIONS}
      value={weekday === null ? "" : String(weekday)}
      onChange={(k) => onPick(Number(k))}
    />
  );
}
