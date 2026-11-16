import type { CalendarLevel } from "@nabd/analytics";
import { Grid, HeatCell, Row, Stack, Text } from "@nabd/design-system";
import type { HeatLevel } from "@nabd/design-system";
import type { CalendarVM } from "./stats-vm";

/** How warm each level of training is drawn; a day still to come is left blank. */
const LEVEL_HEAT: Record<CalendarLevel, HeatLevel | null> = {
  future: null,
  none: "none",
  light: "low",
  medium: "mid",
  full: "high",
};
const LEGEND: readonly HeatLevel[] = ["none", "low", "mid", "high"];
const DAYS_PER_WEEK = 7;

interface CalendarViewProps {
  vm: CalendarVM;
}

/** The current month as a grid of days, tinted by how much was trained on each. */
export function CalendarView({ vm }: CalendarViewProps): JSX.Element {
  const leading = Array.from({ length: vm.firstWeekday }, (_, index) => index);
  return (
    <Stack gap="md">
      <Text variant="mono" tone="faint">
        {vm.month}
      </Text>
      <Grid columns={DAYS_PER_WEEK} gap="xs">
        {vm.weekdays.map((weekday, index) => (
          <Text key={`weekday-${index}`} variant="monoCaption" align="center">
            {weekday}
          </Text>
        ))}
        {leading.map((index) => (
          <HeatCell key={`blank-${index}`} level={null} />
        ))}
        {vm.cells.map(({ day, level }) => (
          <HeatCell key={day} level={LEVEL_HEAT[level]}>
            {day}
          </HeatCell>
        ))}
      </Grid>
      <Row gap="sm">
        <Text as="span" variant="caption">
          Less
        </Text>
        {LEGEND.map((level) => (
          <HeatCell key={level} level={level} size="key" />
        ))}
        <Text as="span" variant="caption">
          More
        </Text>
      </Row>
    </Stack>
  );
}
