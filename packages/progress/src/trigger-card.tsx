import { Card, EmptyNote } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import { TriggerSplit } from "./trigger-split";
import type { TriggerShareVM } from "./triggers-vm";
import { WORDS } from "./wording";

interface TriggerCardProps {
  vm: TriggerShareVM[] | EmptyVM;
}

/** What prompted the logged sets: an idle moment, the timer, or the user. */
export function TriggerCard({ vm }: TriggerCardProps): JSX.Element {
  return (
    <Card title={WORDS.triggers} subtitle={WORDS.triggersHint}>
      {isEmpty(vm) ? <EmptyNote>{vm.empty}</EmptyNote> : <TriggerSplit vm={vm} />}
    </Card>
  );
}
