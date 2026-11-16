import { Card, EmptyNote, Row, Spacer, SplitBar, Stack, Swatch, Text } from "@nabd/design-system";
import type { Tone } from "@nabd/design-system";
import type { Trigger } from "@nabd/domain";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { TriggerShareVM } from "./stats-vm";

const TRIGGER_TONES: Record<Trigger, Tone> = {
  idle: "accent",
  timer: "success",
  manual: "info",
};

interface TriggerSplitProps {
  vm: readonly TriggerShareVM[];
}

/** The triggers as one split bar, and what each colour stands for, with its share in figures. */
function TriggerSplit({ vm }: TriggerSplitProps): JSX.Element {
  return (
    <Stack gap="lg" grow>
      <SplitBar
        segments={vm.map(({ trigger, pct }) => ({
          key: trigger,
          pct,
          tone: TRIGGER_TONES[trigger],
        }))}
      />
      <Spacer />
      <Stack as="ul" gap="md">
        {vm.map(({ trigger, label, share }) => (
          <Row as="li" key={trigger} ariaLabel={label} gap="sm">
            <Swatch shape="square" tone={TRIGGER_TONES[trigger]} />
            <Text as="span" grow>
              {label}
            </Text>
            <Text as="span" variant="monoValue">
              {share}
            </Text>
          </Row>
        ))}
      </Stack>
    </Stack>
  );
}

interface TriggerCardProps {
  vm: TriggerShareVM[] | EmptyVM;
}

/** What prompted the logged sets: an idle moment, the timer, or the user. */
export function TriggerCard({ vm }: TriggerCardProps): JSX.Element {
  return (
    <Card title="What prompts a set" subtitle="Idle detection vs timer vs manual" stacked>
      {isEmpty(vm) ? <EmptyNote>{vm.empty}</EmptyNote> : <TriggerSplit vm={vm} />}
    </Card>
  );
}
