import type { TrainingStats } from "@nabd/analytics";
import type { Trigger } from "@nabd/domain";
import { TRIGGERS, TRIGGER_NAMES } from "@nabd/domain";
import { buildEmptyVM } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import { NOTHING_LOGGED } from "./wording";

export interface TriggerShareVM {
  trigger: Trigger;
  label: string;
  /** 0–100. */
  pct: number;
  /** "56%". */
  share: string;
}

/** What prompted the logged sets, as shares of them all. */
export function buildTriggersVM(stats: TrainingStats): TriggerShareVM[] | EmptyVM {
  const mix = stats.triggerMix();
  if (TRIGGERS.every((trigger) => mix[trigger] === 0)) {
    return buildEmptyVM(`${NOTHING_LOGGED} What prompted each set shows up here.`);
  }
  return TRIGGERS.map((trigger) => ({
    trigger,
    label: TRIGGER_NAMES[trigger],
    pct: mix[trigger],
    share: `${mix[trigger]}%`,
  }));
}
