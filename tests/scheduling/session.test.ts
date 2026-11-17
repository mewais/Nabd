// Which session a set logged today belongs to: a floating visit is exactly one session
// from its first set to its last, whatever else was logged that day, and a set that
// belongs to no carried visit never joins one.

import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import { carry, logged, nov, visit } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, floatingPushPull, pushPull } from "../support/programs";
import { MONDAY, build, dayState, input } from "./fixtures";

const FRIDAY = nov(13);
const TUESDAY = nov(17);
/** The visit begun on Friday, carried into Monday. */
const fridayVisit = visit(FRIDAY, { [benchRow.id]: carry(EX.bench.id, { working: 1 }) });
const continuing = dayState(MONDAY, { dayId: "mon", carried: fridayVisit });
const mondaySet = (hour: number, session: string) =>
  logged(EX.bench, nov(16, hour), 10, 40, { planItemId: benchRow.id, session });

describe("the session of today's sets", () => {
  it("is today's on a floating day begun today, and on a weekday plan", () => {
    expect(build([], dayState(MONDAY), floatingPushPull).session).toBe(dateKey(MONDAY));
    expect(build([], continuing, pushPull).session).toBe(dateKey(MONDAY));
  });

  it("is the visit's while a floating day continues one", () => {
    expect(build([], continuing, floatingPushPull).session).toBe(dateKey(FRIDAY));
  });

  it("switching to floating mid-day onto a carried visit: the visit's, though a weekday set was logged first", () => {
    const weekdaySet = mondaySet(9, dateKey(MONDAY));
    const plan = build([weekdaySet], continuing, floatingPushPull);
    expect(plan.session).toBe(dateKey(FRIDAY));
    // The visit comes back still in the session it began in, not the weekday set's.
    const next = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: continuing,
      history: [weekdaySet],
      date: TUESDAY,
    });
    expect(next.dayState.carried?.startedOn).toBe(dateKey(FRIDAY));
  });

  it("switching to weekdays mid-day: today's own, though the visit's sets were logged first", () => {
    const visitSet = mondaySet(9, dateKey(FRIDAY));
    expect(build([visitSet], continuing, pushPull).session).toBe(dateKey(MONDAY));
  });

  it("a visit that comes back stays in the session it began in, day after day", () => {
    const sets = [mondaySet(9, dateKey(FRIDAY))];
    const tuesday = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: continuing,
      history: sets,
      date: TUESDAY,
    }).dayState;
    expect(build(sets, tuesday, floatingPushPull).session).toBe(dateKey(FRIDAY));
  });
});
