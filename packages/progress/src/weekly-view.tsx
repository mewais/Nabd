import { BarChart, Stack, Text } from "@nabd/design-system";
import type { BarDatum } from "@nabd/design-system";
import { WORDS } from "./wording";

interface WeeklyViewProps {
  vm: readonly BarDatum[];
}

/** Sets per week as bars, the current week last. */
export function WeeklyView({ vm }: WeeklyViewProps): JSX.Element {
  return (
    <Stack gap="md">
      <Text variant="mono" tone="faint">
        {WORDS.weekly}
      </Text>
      <BarChart bars={vm} size="lg" ariaLabel={WORDS.setsPerWeek} />
    </Stack>
  );
}
