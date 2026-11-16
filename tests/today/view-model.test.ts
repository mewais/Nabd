/**
 * @nabd/today — buildTodayVM: what the Today screen says for a given
 * plan, history and nudge state.
 */

import { EMPTY_PROGRAM, MUSCLES } from "@nabd/domain";
import type { HeroVM, NextSetVM, TodayVM } from "@nabd/today";
import { did, mondayProgram, planRow } from "../support/plan-fixtures";
import { nov, working } from "../support/domain-factories";
import { lastWeek, nudgeAt, pushDay, todayVM } from "./fixtures";

function nextHero(hero: HeroVM): NextSetVM {
  if (hero.kind !== "next") throw new Error(`expected a "next" hero, got "${hero.kind}"`);
  return hero;
}

describe("buildTodayVM · hero", () => {
  it("opens the day on the first exercise's warm-up, with no progression advice", () => {
    const hero = nextHero(todayVM({ program: pushDay(), history: lastWeek() }).hero);

    expect(hero.exercise).toBe("Bench Press");
    expect(hero.kicker).toBe("Up next · Set 1 of 3");
    expect(hero.label).toBe("Chest");
    expect(hero.muscleNames).toEqual(["Chest", "Triceps", "Front Delts"]);
    expect(hero.target).toBe("Warm-up · 10 reps");
    expect(hero.notes).toBe("Pause at the chest");
    expect(hero.advice).toBeNull();
  });

  it("after the warm-up, advises beating last week's first working set", () => {
    const history = [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];
    const hero = nextHero(todayVM({ program: pushDay(), history }).hero);

    expect(hero.kicker).toBe("Up next · Set 2 of 3");
    expect(hero.target).toBe("Working set · 8–12 reps · RPE 8");
    expect(hero.advice).toEqual({
      primary: "9 × 60 kg",
      alternative: "8 × 62.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("compares each working set with the same set of the last session", () => {
    const history = [
      ...lastWeek(),
      did("p-bench", "bench", 10, 40, { setType: "warmup" }),
      did("p-bench", "bench", 9, 60),
    ];
    const hero = nextHero(todayVM({ program: pushDay(), history }).hero);

    expect(hero.kicker).toBe("Up next · Set 3 of 3");
    // Last week's second working set was 7 reps: under the 8–12 range.
    expect(hero.advice).toEqual({
      primary: "8 × 60 kg",
      alternative: null,
      reason: "Below your range last time — same load, reach the range first.",
      basis: "Last time: 7 × 60 kg",
    });
  });

  it("words loads in pounds when that is the display unit", () => {
    const history = [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];
    const hero = nextHero(todayVM({ program: pushDay(), history }, { unit: "lb" }).hero);

    expect(hero.advice).toMatchObject({
      primary: "9 × 132.3 lb",
      alternative: "8 × 137.8 lb",
      basis: "Last time: 8 × 132.3 lb",
    });
  });

  it("suggests more load once the top of the range was reached", () => {
    const program = mondayProgram([planRow("p-row", "row", [working(8, 12), working(8, 12)])]);
    const hero = nextHero(todayVM({ program, history: lastWeek() }).hero);

    expect(hero.exercise).toBe("Barbell Row");
    expect(hero.target).toBe("Working set · 8–12 reps");
    expect(hero.notes).toBe("");
    expect(hero.advice).toEqual({
      primary: "8 × 52.5 kg",
      alternative: "13 × 50 kg",
      reason: "You topped your range — time to go heavier.",
      basis: "Last time: 12 × 50 kg",
    });
  });

  it("with no history there is nothing to compare against", () => {
    const program = mondayProgram([planRow("p-row", "row", [working(8, 12)])]);
    const hero = nextHero(todayVM({ program }).hero);

    expect(hero.advice).toMatchObject({
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

    expect(hero.target).toBe("Working set · 30 s");
    expect(hero.advice).toMatchObject({ primary: "35 s", basis: "Last time: 30 s" });
  });

  it("moves on to the next exercise once one is finished", () => {
    const history = [
      did("p-bench", "bench", 10, 40, { setType: "warmup" }),
      did("p-bench", "bench", 9, 60),
      did("p-bench", "bench", 8, 60),
    ];
    const hero = nextHero(todayVM({ program: pushDay(), history }).hero);

    expect(hero.exercise).toBe("Barbell Row");
    expect(hero.kicker).toBe("Up next · Set 1 of 2");
  });

  it("skips over an exercise the user skipped for today", () => {
    const hero = nextHero(todayVM({ program: pushDay(), skipped: ["p-bench"] }).hero);
    expect(hero.exercise).toBe("Barbell Row");
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
    expect(vm.dayName).toBeNull();
    expect(vm.queue).toEqual([]);
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

describe("buildTodayVM · queue", () => {
  const program = () =>
    mondayProgram(
      [
        planRow("p-bench", "bench", [working(8, 12), working(8, 12)]),
        planRow("p-pushup", "pushup", [working(10, 15), working(10, 15)], { supersetId: "ss1" }),
        planRow("p-dip", "dip", [working(6, 10), working(6, 10)], { supersetId: "ss1" }),
        planRow("p-row", "row", [working(8, 12)]),
        planRow("p-plank", "plank", [working(30)], { repMode: "time" }),
      ],
      "Upper body",
    );
  const queue = () =>
    todayVM({
      program: program(),
      skipped: ["p-row"],
      extras: [
        { id: "x-curl", exId: "curl" },
        { id: "x-pullup", exId: "pullup" },
      ],
      history: [
        did("p-bench", "bench", 10, 60),
        did("p-bench", "bench", 9, 60),
        did("p-pushup", "pushup", 12, null),
        did("x-pullup", "pullup", 8, 20),
        did("x-pullup", "pullup", 7, 20),
      ],
    });
  const row = (id: string) => {
    const found = queue().queue.find((r) => r.id === id);
    if (!found) throw new Error(`no queue row "${id}"`);
    return found;
  };

  it("lists the day's exercises in plan order, extras last, under the day's name", () => {
    const vm = queue();
    expect(vm.dayName).toBe("Upper body");
    expect(vm.queue.map((r) => r.exercise)).toEqual([
      "Bench Press",
      "Push-Up",
      "Weighted Dip",
      "Barbell Row",
      "Plank",
      "Dumbbell Curl",
      "Assisted Pull-Up",
    ]);
  });

  it("describes each row by its group and the muscles it works", () => {
    expect(row("p-bench").sub).toBe("Chest · Chest, Triceps, Front Delts");
    expect(row("p-plank").sub).toBe("Abs · Abs, Obliques");
  });

  it("a finished exercise is done and can no longer be skipped", () => {
    expect(row("p-bench")).toMatchObject({ state: "done", badge: "2/2 sets", skipLabel: null });
  });

  it("the first exercise still owing sets is next; later ones are pending", () => {
    expect(row("p-pushup")).toMatchObject({ state: "next", badge: "1/2 sets", skipLabel: "Skip" });
    expect(row("p-dip")).toMatchObject({ state: "pending", badge: "0/2 sets", skipLabel: "Skip" });
    expect(row("p-plank")).toMatchObject({ state: "pending", badge: "0/1 set" });
    expect(queue().queue.filter((r) => r.state === "next")).toHaveLength(1);
  });

  it("marks superset partners A1/A2 and every other row with its place in the day", () => {
    expect(row("p-bench").marker).toBe("01");
    expect(row("p-pushup").marker).toBe("A1");
    expect(row("p-dip").marker).toBe("A2");
    expect(row("p-row").marker).toBe("04");
    expect(row("x-curl").marker).toBe("06");
  });

  it("anything not skipped can be started; a finished exercise takes more sets", () => {
    expect(row("p-pushup").startLabel).toBe("Start");
    expect(row("x-curl").startLabel).toBe("Start");
    expect(row("p-bench").startLabel).toBe("More");
    expect(row("p-row").startLabel).toBeNull();
  });

  it("a skipped exercise says so and offers to restore it", () => {
    expect(row("p-row")).toMatchObject({
      state: "skipped",
      badge: "Skipped",
      skipLabel: "Restore",
    });
  });

  it("an untouched extra shows a bare set count and can be removed", () => {
    expect(row("x-curl")).toMatchObject({ state: "pending", badge: "0 sets", skipLabel: "Remove" });
  });

  it("an extra with logged sets is done and can no longer be removed", () => {
    expect(row("x-pullup")).toMatchObject({ state: "done", badge: "2 sets", skipLabel: null });
  });
});

describe("buildTodayVM · muscle targets without exercises", () => {
  const slot = (id: string, muscle: "chest" | "lats" | "abs", pool: string[]) => ({
    id,
    muscle,
    pool,
    repMode: "range" as const,
    intensity: "none" as const,
    rest: 90,
    sets: [working(8, 12)],
  });
  const cycled = (slots: ReturnType<typeof slot>[]) => ({
    ...mondayProgram([]),
    type: "cycled" as const,
    days: [{ id: "mon", name: "Full body", weekday: 1, exercises: [], slots }],
  });

  it("says which cycled targets were left out because their pool is empty", () => {
    const vm = todayVM({
      program: cycled([
        slot("s1", "chest", ["bench"]),
        slot("s2", "lats", []),
        slot("s3", "abs", []),
      ]),
    });
    expect(vm.queue.map((row) => row.exercise)).toEqual(["Bench Press"]);
    expect(vm.emptySlotsNote).toBe("2 muscle targets have no exercises yet: Lats, Abs");

    const one = todayVM({ program: cycled([slot("s2", "lats", [])]) });
    expect(one.emptySlotsNote).toBe("1 muscle target has no exercises yet: Lats");
  });

  it("says nothing when every target has an exercise", () => {
    expect(
      todayVM({ program: cycled([slot("s1", "chest", ["bench"])]) }).emptySlotsNote,
    ).toBeNull();
    expect(todayVM({ program: pushDay() }).emptySlotsNote).toBeNull();
  });
});

describe("buildTodayVM · stats", () => {
  const history = () => [
    did(null, "bench", 8, 60, { at: nov(14, 12, 0) }),
    did(null, "bench", 8, 60, { at: nov(15, 12, 0) }),
    did("p-bench", "bench", 10, 40, { setType: "warmup" }),
    did("p-bench", "bench", 9, 60),
  ];
  const figures = (vm: TodayVM) =>
    Object.fromEntries(vm.stats.map((tile) => [tile.label, `${tile.value} ${tile.unit}`]));

  it("reports the streak, this week's sets and the load moved today", () => {
    const vm = todayVM({ program: pushDay(), history: history() });
    // Sat + Sun + today; only today's two sets fall in the week that starts this Monday.
    expect(figures(vm)).toEqual({
      Streak: "3 days",
      "This week": "2 sets",
      "Lifted today": "940 kg",
    });
  });

  it("converts today's volume to pounds for lb users, grouping the digits", () => {
    const vm = todayVM({ program: pushDay(), history: history() }, { unit: "lb" });
    expect(figures(vm)).toMatchObject({ "Lifted today": "2,072 lb" });
  });

  it("counts nothing lifted for bodyweight work", () => {
    const program = mondayProgram([planRow("p-pushup", "pushup", [working(10, 15)])]);
    const vm = todayVM({ program, history: [did("p-pushup", "pushup", 12, null)] });
    expect(figures(vm)).toMatchObject({ "Lifted today": "0 kg", "This week": "1 sets" });
  });
});

describe("buildTodayVM · coverage and insight", () => {
  /** Twelve chest sets this week: chest is well covered, the rest of the plan lags. */
  const benchWeek = () =>
    Array.from({ length: 12 }, (unused, i) => did(null, "bench", 8, 60, { at: nov(13, 12, i) }));

  it("carries the map's view and style through", () => {
    const vm = todayVM({ program: pushDay() }, { mapView: "back", mapStyle: "outline" });
    expect(vm.coverage).toMatchObject({ view: "back", mapStyle: "outline" });
  });

  it("lists every muscle down the body with its coverage and what it is due", () => {
    const { legend } = todayVM({ program: pushDay(), history: benchWeek() }).coverage;
    expect(legend).toHaveLength(MUSCLES.length);
    expect(legend[0]).toEqual({ muscle: "front_delts", pct: 37.5, recommendation: "push" });
    expect(legend.find((row) => row.muscle === "chest")).toMatchObject({
      pct: 75,
      recommendation: "rest",
    });
    expect(legend.at(-1)?.muscle).toBe("neck");
  });

  it("says which muscles to rest, and which of the muscles the plan trains to push", () => {
    const { insight } = todayVM({ program: pushDay(), history: benchWeek() });
    expect(insight).toEqual([
      { kind: "rest", lead: "Rest these", text: " — Chest are well-trained this week." },
      {
        kind: "push",
        lead: "Push these",
        text: " — Rhomboids, Lats, Abs are lagging. Good to prioritize.",
      },
    ]);
  });

  it("has nothing to say without a plan or a history", () => {
    expect(todayVM({ program: EMPTY_PROGRAM }).insight).toEqual([]);
  });
});
