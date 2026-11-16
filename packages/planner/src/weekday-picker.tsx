import type { Weekday } from "@nabd/domain";
import { Segmented } from "@nabd/design-system";
import { WEEKDAY_INITIAL_OPTIONS } from "./options";

interface WeekdayPickerProps {
  /** Null while the day is on no weekday. */
  weekday: Weekday | null;
  onPick: (weekday: Weekday) => void;
}

/** Monday to Sunday: the weekday a day is trained on. */
export function WeekdayPicker({ weekday, onPick }: WeekdayPickerProps): JSX.Element {
  return (
    <Segmented
      size="sm"
      ariaLabel="Weekday"
      options={WEEKDAY_INITIAL_OPTIONS}
      value={weekday}
      onChange={onPick}
    />
  );
}
