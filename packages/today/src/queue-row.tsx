import { Button, CheckMark, Row, Text, TitleBlock } from "@nabd/design-system";
import type { TextTone } from "@nabd/design-system";
import type { QueueRowVM } from "./queue-vm";
import type { TodayActions } from "./today-actions";

interface QueueRowProps {
  vm: QueueRowVM;
  actions: Pick<TodayActions, "start" | "toggleSkip">;
}

type RowState = QueueRowVM["state"];

/** What the row's mark says to assistive tech; its shape says the same to the eye. */
const STATE_NAMES: Record<RowState, string> = {
  next: "Up next",
  pending: "To do",
  done: "Done",
  skipped: "Skipped",
};

const BADGE_TONES: Record<RowState, TextTone> = {
  next: "accent",
  pending: "faint",
  done: "success",
  skipped: "faint",
};

/** One exercise of the day: where it stands and what can be done with it. */
export function QueueRow({ vm, actions }: QueueRowProps): JSX.Element {
  const { state } = vm;
  return (
    <Row
      as="li"
      ariaLabel={vm.exercise}
      gap="md"
      paddingX="xl"
      paddingY="md"
      edge="top"
      dimmed={state === "skipped"}
    >
      <Text as="span" variant="mono" tone="faint">
        {vm.marker}
      </Text>
      <CheckMark checked={state === "done"} current={state === "next"} label={STATE_NAMES[state]} />
      <TitleBlock
        size="row"
        title={vm.exercise}
        subtitle={vm.sub}
        tone={state === "next" ? "strong" : "muted"}
        grow
      />
      <Text as="span" variant="mono" tone={BADGE_TONES[state]}>
        {vm.badge}
      </Text>
      {vm.skip !== null && (
        <Button
          variant="ghost"
          size="sm"
          ariaLabel={vm.skip.name}
          onClick={() => actions.toggleSkip(vm.id)}
        >
          {vm.skip.label}
        </Button>
      )}
      {vm.start !== null && (
        <Button
          variant="ghost"
          size="sm"
          tone="accent"
          ariaLabel={vm.start.name}
          onClick={() => actions.start(vm.id)}
        >
          {vm.start.label}
        </Button>
      )}
    </Row>
  );
}
