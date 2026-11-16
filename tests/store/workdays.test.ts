import { dateKey } from "@nabd/domain";
import { selectNudgeStatus, selectPendingNudge, selectStats } from "@nabd/store";
import { nov } from "../support/builders";
import { catalogBenchRow, catalogFlyRow, catalogPushPull } from "../support/programs";
import { boot, fakeBackend } from "./fixtures";

const FRIDAY = 20;
const SATURDAY = 21;
const SUNDAY = 22;
const MONDAY = 23;

// The workdays are Monday to Friday, 09:00–18:00, unless a test says otherwise.
const bootOn = (day: number, hour = 10) => {
  const initial = { program: catalogPushPull };
  return boot(initial, fakeBackend(initial), nov(day, hour));
};

describe("workdays", () => {
  it("never nudges on a day off, says when it resumes, and resumes on the next workday", async () => {
    const app = await bootOn(FRIDAY, 19);
    expect(selectNudgeStatus(app.get())).toMatchObject({ state: "off_hours", inDays: 3 });

    app.advanceTo(nov(SATURDAY, 12), 999);
    expect(selectNudgeStatus(app.get())).toEqual({
      state: "off_hours",
      at: nov(MONDAY, 9),
      inDays: 2,
    });
    expect(selectPendingNudge(app.get())).toBeNull();
    app.advanceTo(nov(SUNDAY, 15), 999);
    expect(selectPendingNudge(app.get())).toBeNull();

    // The clock beats through midnight, which starts Monday's count.
    app.advanceTo(nov(MONDAY, 0, 1));
    app.advanceTo(nov(MONDAY, 9, 30));
    expect(selectNudgeStatus(app.get())).toMatchObject({
      state: "waiting",
      at: nov(MONDAY, 9, 50),
    });
    app.advanceTo(nov(MONDAY, 9, 50));
    expect(selectNudgeStatus(app.get())).toEqual({ state: "due", reason: "timer" });
  });

  it("still shows the day's plan and takes a set on a day off, without nudging for the rest", async () => {
    const app = await bootOn(SATURDAY);
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().hasWork).toBe(true);
    await app.log(catalogBenchRow.id, 1);
    expect(app.get().history).toHaveLength(1);
    app.advanceTo(nov(SATURDAY, 15), 999);
    expect(selectNudgeStatus(app.get()).state).toBe("off_hours");
  });

  it("the days that are worked are a setting: a Saturday worker is nudged on Saturday", async () => {
    const app = await bootOn(SATURDAY, 9);
    expect(selectNudgeStatus(app.get()).state).toBe("off_hours");
    app.get().updateSettings({ workDays: [1, 2, 3, 4, 5, 6] });
    expect(selectNudgeStatus(app.get()).state).toBe("waiting");
    // At least one weekday stays on.
    app.get().updateSettings({ workDays: [] });
    expect(app.get().settings.workDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(app.data.settings).toMatchObject({ workDays: [1, 2, 3, 4, 5, 6] });
  });

  it("an idle weekend neither moves the plan on nor puts anything on record", async () => {
    const app = await bootOn(FRIDAY);
    await app.log(catalogBenchRow.id, 3);
    app.advanceTo(nov(SATURDAY, 10));
    app.advanceTo(nov(SUNDAY, 10));
    app.advanceTo(nov(MONDAY, 9));

    // Friday: one of Push's two exercises done; the weekend added nothing to the log.
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(FRIDAY)), planned: 6, done: 3 }]);
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().item(catalogBenchRow.id)).toMatchObject({
      status: "done",
      carried: { working: 3, warmup: 0, drop: 0 },
    });
    expect(app.plan().item(catalogFlyRow.id)).toMatchObject({ owed: 3, remaining: 3 });
    expect(selectStats(app.get()).completionThisWeek()).toBe(0);
  });

  it("sets logged on a day off count, and finishing the day there moves the plan on", async () => {
    const app = await bootOn(FRIDAY);
    await app.log(catalogBenchRow.id, 3);
    app.advanceTo(nov(SATURDAY, 10));
    await app.log(catalogFlyRow.id, 3);
    app.advanceTo(nov(SUNDAY, 10));

    expect(app.plan().dayName).toBe("Pull");
    expect(app.get().dayLog).toEqual([
      { date: dateKey(nov(FRIDAY)), planned: 6, done: 3 },
      { date: dateKey(nov(SATURDAY)), planned: 3, done: 3 },
    ]);
  });
});
