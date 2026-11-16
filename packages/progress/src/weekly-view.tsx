import { BarChart, Stack, Text } from "@nabd/design-system";
import type { BarDatum } from "@nabd/design-system";

interface WeeklyViewProps {
  vm: readonly BarDatum[];
}

/** Sets per week as bars, the current week last. */
export function WeeklyView({ vm }: WeeklyViewProps): JSX.Element {
  return (
    <Stack gap="md">
      <Text variant="mono" tone="faint">
        Sets per week · last 8 weeks
      </Text>
      <BarChart bars={vm} size="lg" ariaLabel="Sets per week" />
    </Stack>
  );
}
