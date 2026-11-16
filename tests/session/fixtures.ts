import type { CarriedVisit, LoggedSet, Program } from "@nabd/domain";
import { DEFAULT_SETTINGS, dateKey, freshDayState } from "@nabd/domain";
import { ProgressionAdvisor } from "@nabd/progression";
import { TodayPlan } from "@nabd/scheduling";
import type { PlanItem } from "@nabd/scheduling";
import { Coach } from "@nabd/session";
import { exercise, lookupIn, nov, row, warmup, working } from "../support/builders";

export const TODAY = nov(16);
export const curl = exercise({ name: "Curl" });
export const plank = exercise({ name: "Plank", tracking: "duration" });
export const curlRow = row(curl.id, [warmup(15), working(8, 12), working(8, 12)]);
export const plankRow = row(plank.id, [working(45)], { repMode: "time" });

export const program: Program = {
  name: "P",
  type: "fixed",
  schedule: "floating",
  days: [{ id: "d", name: "D", weekday: null, exercises: [curlRow, plankRow], slots: [] }],
};

/** Today's curl and plank, with what earlier days of this floating day already did. */
export function itemsFor(
  history: LoggedSet[],
  carried: CarriedVisit | null = null,
): { curlItem: PlanItem; plankItem: PlanItem } {
  const plan = TodayPlan.build({
    program,
    date: TODAY,
    dayState: freshDayState(TODAY, null, carried),
    rotation: {},
    history,
    lookup: lookupIn([curl, plank]),
    workDays: DEFAULT_SETTINGS.workDays,
  });
  return { curlItem: plan.item(curlRow.id)!, plankItem: plan.item(plankRow.id)! };
}

/** The coach of the session `session` (today's own, unless a floating day came back). */
export const coachFor = (history: LoggedSet[], session = dateKey(TODAY)): Coach =>
  new Coach(history, new ProgressionAdvisor(2.5), session);
