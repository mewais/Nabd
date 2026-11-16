import { Button, Card, CheckMark, Stack, Text } from "@nabd/design-system";
import type { HeroNoticeVM } from "./hero-vm";
import type { TodayActions } from "./today-actions";

interface HeroNoticeProps {
  vm: HeroNoticeVM;
  actions: Pick<TodayActions, "logOther">;
}

/** A centred message in place of the next set: the day is done, skipped, or has no plan. */
export function HeroNotice({ vm, actions }: HeroNoticeProps): JSX.Element {
  return (
    <Card padding="xxl">
      <Stack align="center" gap="md" paddingY="sm">
        {vm.kind === "complete" && <CheckMark checked size="lg" />}
        <Stack align="center" gap="xs">
          <Text variant="headline" align="center">
            {vm.title}
          </Text>
          <Text tone="muted" align="center">
            {vm.text}
          </Text>
        </Stack>
        {vm.offersLogOther && (
          <Button variant="ghost" size="md" onClick={actions.logOther}>
            Log something else
          </Button>
        )}
      </Stack>
    </Card>
  );
}
