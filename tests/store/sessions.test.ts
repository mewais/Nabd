// Which session a set belongs to: a floating visit is one session from its first set
// to its last, and a set that belongs to no carried visit never joins one.

import { dateKey } from "@nabd/domain";
import { selectCoach } from "@nabd/store";
import { nov } from "../support/builders";
import { catalogBenchRow, catalogFlyRow, catalogPushPull } from "../support/programs";
import { benchSet, boot } from "./fixtures";

describe("sessions", () => {
  it("a day that comes back is one session with the day it began on, for its sets and its advice", async () => {
    // Last Monday's bench went 10, 9, 8 at 40 kg.
    const lastWeek = [10, 9, 8].map((reps, set) =>
      benchSet(nov(9, 10 + set), { value: reps, planItemId: catalogBenchRow.id }),
    );
    const app = await boot({ program: catalogPushPull, history: lastWeek });
    await app.log(catalogBenchRow.id, 1);
    app.advanceTo(nov(17, 9, 30));

    expect(app.plan().session).toBe(dateKey(nov(16)));
    const bench = app.plan().item(catalogBenchRow.id)!;
    // Set 2 of the visit is compared with set 2 of last Monday, not with yesterday's set 1.
    expect(selectCoach(app.get()).adviceFor(bench)?.basis).toEqual({ reps: 9, weight: 40 });
    await app.log(catalogBenchRow.id, 1);
    expect(app.get().history.at(-1)).toMatchObject({
      date: dateKey(nov(17)),
      session: dateKey(nov(16)),
    });
  });

  it("a visit that comes back again stays the session its sets joined, after what it carried was edited away", async () => {
    const app = await boot({ program: catalogPushPull });
    await app.log(catalogBenchRow.id, 1);
    app.advanceTo(nov(17, 9, 30));
    await app.log(catalogFlyRow.id, 1);
    // What Monday carried leaves the plan; Tuesday's set already belongs to Monday's session.
    const push = catalogPushPull.days[0]!.id;
    app.get().editProgram((editor) => editor.removeExercise(push, catalogBenchRow.id));
    app.advanceTo(nov(18, 9, 30));
    expect(app.plan().session).toBe(dateKey(nov(16)));
    await app.log(catalogFlyRow.id, 1);
    const fly = app.get().history.filter((set) => set.exId === catalogFlyRow.exId);
    expect(fly.map((set) => set.session)).toEqual([dateKey(nov(16)), dateKey(nov(16))]);
  });
});
