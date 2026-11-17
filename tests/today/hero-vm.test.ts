/** @nabd/today — buildTodayVM, the hero: the next set, or why there is none. */

import { EMPTY_PROGRAM } from "@nabd/domain";
import type { TodayVM } from "@nabd/today";
import { nov, working } from "../support/builders";
import { did, lastWeek, mondayProgram, planRow, pushDay } from "../support/programs";
import { nudgeAt, todayVM } from "./fixtures";

type HeroVM = TodayVM["hero"];

function nextHero(hero: HeroVM): Extract<HeroVM, { kind: "next" }> {
  if (hero.kind !== "next") throw new Error(`expected a "next" hero, got "${hero.kind}"`);
  return hero;
}

describe("buildTodayVM · hero", () => {
  it("opens the day on the first exercise's warm-up, with no progression advice", () => {
    const hero = nextHero(todayVM({ program: pushDay(), history: lastWeek() }).hero);

    expect(hero.set.exercise).toBe("Bench Press");
    expect(hero.kicker).toBe("Up next · Set 1 of 3");
    expect(hero.label).toBe("Chest");
    expect(hero.set.muscleNames).toEqual(["Chest", "Triceps", "Front Delts"]);
    expect(hero.set.target).toBe("Warm-up · 10 reps");
    expect(hero.set.notes).toBe("Pause at the chest");
    expect(hero.set.advice).toBeNull();
  });

  it("after the warm-up, advises beating last week's first working set", () => {
    const history = [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];
    const hero = nextHero(todayVM({ program: pushDay("none"), history }).hero);

    expect(hero.kicker).toBe("Up next · Set 2 of 3");
    expect(hero.set.target).toBe("Working set · 8–12 reps");
    expect(hero.set.advice).toEqual({
      primary: "9 × 60 kg",
      alternative: "8 × 62.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("where the set asks for an RPE, advises the load that leaves those reps in reserve", () => {
    const history = [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];
    const hero = nextHero(todayVM({ program: pushDay(), history }).hero);

    expect(hero.set.target).toBe("Working set · 8–12 reps · RPE 8");
    // Last week's 8 × 60 kg is an estimated max of 76 kg; RPE 8 is 2 in reserve.
    expect(hero.set.advice).toEqual({
      primary: "8 × 57.5 kg",
      alternative: "9 × 60 kg",
      reason: "RPE 8 ≈ 2 reps in reserve.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("compares each working set with the same set of the last session", () => {
    const history = [
      ...lastWeek(),
      did("p-bench", "bench", 10, 40, { setType: "warmup" }),
      did("p-bench", "bench", 9, 60),
    ];
    const hero = nextHero(todayVM({ program: pushDay("none"), history }).hero);

    expect(hero.kicker).toBe("Up next · Set 3 of 3");
    // Last week's second working set was 7 reps: under the 8–12 range.
    expect(hero.set.advice).toEqual({
      primary: "8 × 60 kg",
      alternative: null,
      reason: "Below your range last time — same load, reach the range first.",
      basis: "Last time: 7 × 60 kg",
    });
  });

  it("words loads in pounds when that is the display unit", () => {
    const history = [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];
    const hero = nextHero(todayVM({ program: pushDay("none"), history }, { unit: "lb" }).hero);

    expect(hero.set.advice).toMatchObject({
      primary: "9 × 132.3 lb",
      alternative: "8 × 137.8 lb",
      basis: "Last time: 8 × 132.3 lb",
    });
  });

  it("suggests more load once the top of the range was reached", () => {
    const program = mondayProgram([planRow("p-row", "row", [working(8, 12), working(8, 12)])]);
    const hero = nextHero(todayVM({ program, history: lastWeek() }).hero);

    expect(hero.set.exercise).toBe("Barbell Row");
    expect(hero.set.target).toBe("Working set · 8–12 reps");
    expect(hero.set.notes).toBe("");
    expect(hero.set.advice).toEqual({
      primary: "8 × 52.5 kg",
      alternative: "13 × 50 kg",
      reason: "You topped your range — time to go heavier.",
      basis: "Last time: 12 × 50 kg",
    });
  });

  it("with no history there is nothing to compare against", () => {
    const program = mondayProgram([planRow("p-row", "row", [working(8, 12)])]);
    const hero = nextHero(todayVM({ program }).hero);

    expect(hero.set.advice).toMatchObject({
      alternative: null,
      basis: null,
      reason: "First time — start light and find your level.",
    });
  });

  it("words a timed hold in seconds", () => {
    const program = mondayProgram([
      planRow("p-plank", "plank", [working(30)], { repMode: "time" }),
    ]);
    const hero = nextHero(todayVM({ program, history: lastWeek() }).hero);

    expect(hero.set.target).toBe("Working set · 30 s");
    expect(hero.set.advice).toMatchObject({ primary: "35 s", basis: "Last time: 30 s" });
  });

  it("moves on to the next exercise once one is finished", () => {
    const history = [
      did("p-bench", "bench", 10, 40, { setType: "warmup" }),
      did("p-bench", "bench", 9, 60),
      did("p-bench", "bench", 8, 60),
    ];
    const hero = nextHero(todayVM({ program: pushDay(), history }).hero);

    expect(hero.set.exercise).toBe("Barbell Row");
    expect(hero.kicker).toBe("Up next · Set 1 of 2");
  });

  it("skips over an exercise the user skipped for today", () => {
    const hero = nextHero(todayVM({ program: pushDay(), skipped: ["p-bench"] }).hero);
    expect(hero.set.exercise).toBe("Barbell Row");
  });

  it("flags a due nudge and says why", () => {
    // 10:30 with nothing logged since the 09:00 workday start: the 50-minute interval is up.
    const now = nov(16, 10, 30);
    const hero = nextHero(todayVM({ program: pushDay(), now }, { nudge: nudgeAt(now) }).hero);

    expect(hero.nudge.due).toBe(true);
    expect(hero.nudge.line).toBe("Interval's up");
    expect(hero.snoozeLabel).toBe("Snooze 5m");
  });

  it("while waiting, says when the next nudge comes", () => {
    const now = nov(16, 10, 30);
    const nudge = nudgeAt(now, { lastSetAt: nov(16, 10, 20) });
    const hero = nextHero(todayVM({ program: pushDay(), now }, { nudge }).hero);

    expect(hero.nudge.due).toBe(false);
    expect(hero.nudge.line).toBe("Next nudge at 11:10, sooner if you go idle");
  });

  it("says so when nudges are paused or the workday is over", () => {
    const now = nov(16, 10, 30);
    const paused = nextHero(
      todayVM({ program: pushDay(), now }, { nudge: nudgeAt(now, { paused: true }) }).hero,
    );
    expect(paused.nudge.due).toBe(false);
    expect(paused.nudge.line).toBe("Nudges paused");

    const evening = nov(16, 20, 0);
    const late = nextHero(
      todayVM({ program: pushDay(), now: evening }, { nudge: nudgeAt(evening) }).hero,
    );
    expect(late.nudge.line).toBe("Quiet until 09:00");
  });

  it("celebrates with the day's set count once everything prescribed is logged", () => {
    const program = mondayProgram([planRow("p-row", "row", [working(8, 12), working(8, 12)])]);
    const history = [did("p-row", "row", 12, 50), did("p-row", "row", 11, 50)];

    expect(todayVM({ program, history }).hero).toEqual({
      kind: "complete",
      title: "Day complete",
      text: "All 2 sets logged across your workday. Nice work.",
      offersLogOther: false,
    });
  });

  it("is a rest day when the program has nothing on this weekday", () => {
    const tuesday = nov(17, 10, 30);
    const vm = todayVM({ program: pushDay(), now: tuesday, history: lastWeek() });

    expect(vm.hero).toMatchObject({ kind: "rest", title: "Rest day", offersLogOther: true });
    expect(vm.queue.dayName).toBeNull();
    expect(vm.queue.rows).toEqual([]);
  });

  it("tells a day that was skipped outright apart from a rest day", () => {
    const vm = todayVM({ program: pushDay(), skipped: ["p-bench", "p-row", "p-plank"] });
    expect(vm.hero).toEqual({
      kind: "skipped",
      title: "Everything skipped today",
      text: "Restore an exercise from the queue below, or log something else.",
      offersLogOther: true,
    });
  });

  it("tells a rest day apart from having no program at all", () => {
    expect(todayVM({ program: EMPTY_PROGRAM }).hero).toMatchObject({
      kind: "no-plan",
      title: "No plan yet",
      text: expect.stringContaining("Plan screen"),
      offersLogOther: false,
    });
  });
});
