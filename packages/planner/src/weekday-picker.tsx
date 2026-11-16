import { Segmented } from "@nabd/design-system";
import { WEEKDAY_OPTIONS } from "./options";

interface WeekdayPickerProps {
  /** 0 = Sunday … 6 = Saturday; null while the day is on no weekday. */
  weekday: number | null;
  onPick: (weekday: number) => void;
}

/** Monday to Sunday: the weekday a day is trained on. */
export function WeekdayPicker({ weekday, onPick }: WeekdayPickerProps): JSX.Element {
  return (
    <Segmented
      size="sm"
      ariaLabel="Weekday"
      options={WEEKDAY_OPTIONS}
      value={weekday === null ? "" : String(weekday)}
      onChange={(value) => onPick(Number(value))}
    />
  );
}
