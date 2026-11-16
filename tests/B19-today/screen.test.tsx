/**
 * B19 · @nabd/today — the Today screen's cards: what they show for a
 * view-model and which callbacks their controls fire.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MUSCLES } from "@nabd/domain";
import type { Coverage } from "@nabd/domain";
import {
  CoverageCard,
  HeroCard,
  QueueCard,
  StatTiles,
  TodayScreen,
  VolumeInsightCard,
} from "@nabd/today";
import type { HeroVM, QueueRowVM, TodayScreenProps, TodayVM } from "@nabd/today";
import { did, mondayProgram, planRow, work } from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";
import { lastWeek, nudgeAt, pushDay, todayVM } from "./fixtures";

const coverage = (over: Partial<Coverage> = {}): Coverage => ({
  ...(Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Coverage),
  ...over,
});

/** Monday after the bench warm-up: a working set is next and a nudge is due. */
const midSession = (): TodayVM =>
  todayVM(
    {
      program: pushDay(),
      history: [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })],
    },
    { nudge: nudgeAt(nov(16, 10, 30)) },
  );

describe("HeroCard", () => {
  const handlers = () => ({ onStart: vi.fn(), onSnooze: vi.fn(), onLogOther: vi.fn() });
  const waitingHero = (): HeroVM =>
    todayVM(
      { program: pushDay(), history: lastWeek() },
      { nudge: nudgeAt(nov(16, 10, 30), { lastSetAt: nov(16, 10, 20) }) },
    ).hero;

  it("presents the next set: exercise, position, target, muscles, notes and advice", () => {
    const { container } = render(<HeroCard vm={midSession().hero} {...handlers()} />);

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("UP NEXT · SET 2 OF 3")).toBeInTheDocument();
    expect(screen.getByText("Working set · 8–12 reps · RPE 8")).toBeInTheDocument();
    expect(screen.getByText("Triceps")).toBeInTheDocument();
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
    expect(screen.getByText("Pause at the chest")).toBeInTheDocument();
    expect(container).toHaveTextContent("Try 9 × 60 kg or 8 × 62.5 kg");
    expect(container).toHaveTextContent("Last time: 8 × 60 kg");
  });

  it("shows no advice for a warm-up", () => {
    const { container } = render(<HeroCard vm={waitingHero()} {...handlers()} />);
    expect(screen.getByText("Warm-up · 10 reps")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Try ");
  });

  it("Start set and Log something else call their handlers", () => {
    const h = handlers();
    render(<HeroCard vm={midSession().hero} {...h} />);

    fireEvent.click(screen.getByRole("button", { name: "Start set" }));
    expect(h.onStart).toHaveBeenCalledTimes(1);
    expect(h.onLogOther).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Log something else" }));
    expect(h.onLogOther).toHaveBeenCalledTimes(1);
    expect(h.onSnooze).not.toHaveBeenCalled();
  });

  it("offers Snooze only while a nudge is due", () => {
    const h = handlers();
    const due = render(<HeroCard vm={midSession().hero} {...h} />);
    expect(screen.getByText("Interval's up")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /snooze/i }));
    expect(h.onSnooze).toHaveBeenCalledTimes(1);
    due.unmount();

    render(<HeroCard vm={waitingHero()} {...h} />);
    expect(screen.queryByRole("button", { name: /snooze/i })).toBeNull();
    expect(screen.getByText("Next nudge at 11:10, sooner if you go idle")).toBeInTheDocument();
  });

  it("celebrates a finished day instead of offering a set", () => {
    render(<HeroCard vm={{ kind: "complete", setsDone: 6 }} {...handlers()} />);
    expect(screen.getByText("Day complete")).toBeInTheDocument();
    expect(screen.getByText(/All 6 sets logged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start set" })).toBeNull();
  });

  it("explains a rest day, and points to the Plan screen when there is no program", () => {
    const rest = render(
      <HeroCard vm={{ kind: "rest", hasProgram: true, allSkipped: false }} {...handlers()} />,
    );
    expect(screen.getByText("Rest day")).toBeInTheDocument();
    expect(screen.getByText(/Nothing is planned for today/)).toBeInTheDocument();
    rest.unmount();

    render(
      <HeroCard vm={{ kind: "rest", hasProgram: false, allSkipped: false }} {...handlers()} />,
    );
    expect(screen.getByText("No plan yet")).toBeInTheDocument();
    expect(screen.getByText(/Plan screen/)).toBeInTheDocument();
    expect(screen.queryByText("Rest day")).toBeNull();
  });
});

describe("QueueCard", () => {
  const rows = (): QueueRowVM[] =>
    todayVM({
      program: mondayProgram([
        planRow("p-bench", "bench", [work(8, 12)]),
        planRow("p-pushup", "pushup", [work(10, 15), work(10, 15)], { supersetId: "ss1" }),
        planRow("p-dip", "dip", [work(6, 10)], { supersetId: "ss1" }),
        planRow("p-row", "row", [work(8, 12)]),
      ]),
      skipped: ["p-row"],
      extras: [{ id: "x-curl", exId: "curl" }],
      history: [did("p-bench", "bench", 10, 60), did("p-pushup", "pushup", 12, null)],
    }).queue;
  const setup = () => {
    const onStart = vi.fn();
    const onToggleSkip = vi.fn();
    render(
      <QueueCard dayName="Push" rows={rows()} onStart={onStart} onToggleSkip={onToggleSkip} />,
    );
    const rowOf = (exercise: string) => {
      const row = screen.getByText(exercise).closest<HTMLElement>("[data-state]");
      if (!row) throw new Error(`no queue row for "${exercise}"`);
      return within(row);
    };
    return { onStart, onToggleSkip, rowOf };
  };

  it("shows the day's name and each exercise with its progress", () => {
    const { rowOf } = setup();
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(rowOf("Bench Press").getByText("1/1 set")).toBeInTheDocument();
    expect(rowOf("Push-Up").getByText("1/2 sets")).toBeInTheDocument();
    expect(rowOf("Barbell Row").getByText("Skipped")).toBeInTheDocument();
    expect(rowOf("Dumbbell Curl").getByText("0 sets")).toBeInTheDocument();
  });

  it("numbers rows by position, except superset members which show their tag", () => {
    const { rowOf } = setup();
    expect(rowOf("Bench Press").getByText("01")).toBeInTheDocument();
    expect(rowOf("Push-Up").getByText("A1")).toBeInTheDocument();
    expect(rowOf("Weighted Dip").getByText("A2")).toBeInTheDocument();
    expect(rowOf("Barbell Row").getByText("04")).toBeInTheDocument();
  });

  it("any unfinished exercise can be started, whatever the order", () => {
    const { onStart, rowOf } = setup();
    fireEvent.click(rowOf("Weighted Dip").getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith("p-dip");
  });

  it("a finished exercise offers More instead of Start, and no Skip", () => {
    const { onStart, rowOf } = setup();
    const bench = rowOf("Bench Press");
    expect(bench.queryByRole("button", { name: "Start" })).toBeNull();
    expect(bench.queryByRole("button", { name: "Skip" })).toBeNull();
    fireEvent.click(bench.getByRole("button", { name: "More" }));
    expect(onStart).toHaveBeenCalledWith("p-bench");
  });

  it("Skip asks to skip that exercise", () => {
    const { onStart, onToggleSkip, rowOf } = setup();
    fireEvent.click(rowOf("Push-Up").getByRole("button", { name: "Skip" }));
    expect(onToggleSkip).toHaveBeenCalledWith("p-pushup");
    expect(onStart).not.toHaveBeenCalled();
  });

  it("a skipped exercise can only be restored", () => {
    const { onToggleSkip, rowOf } = setup();
    const skipped = rowOf("Barbell Row");
    expect(skipped.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(skipped.getByRole("button", { name: "Restore" }));
    expect(onToggleSkip).toHaveBeenCalledWith("p-row");
  });

  it("an untouched extra can be started or removed", () => {
    const { onStart, onToggleSkip, rowOf } = setup();
    const extra = rowOf("Dumbbell Curl");
    fireEvent.click(extra.getByRole("button", { name: "Remove" }));
    expect(onToggleSkip).toHaveBeenCalledWith("x-curl");
    fireEvent.click(extra.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith("x-curl");
  });
});

describe("CoverageCard", () => {
  const setup = (mapView: "both" | "front" | "back" = "both") => {
    const onMapView = vi.fn();
    const onMapStyle = vi.fn();
    render(
      <CoverageCard
        coverage={coverage({ chest: 80 })}
        mapView={mapView}
        mapStyle="heat"
        onMapView={onMapView}
        onMapStyle={onMapStyle}
      />,
    );
    return { onMapView, onMapStyle };
  };

  it("shows both sides of the body by default, or just the chosen one", () => {
    const both = setup("both");
    expect(screen.getByText("FRONT")).toBeInTheDocument();
    expect(screen.getByText("BACK")).toBeInTheDocument();
    expect(both.onMapView).not.toHaveBeenCalled();
  });

  it.each([
    ["front", "FRONT", "BACK"],
    ["back", "BACK", "FRONT"],
  ] as const)("in '%s' view only the %s map is drawn", (view, shown, hidden) => {
    setup(view);
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.queryByText(hidden)).toBeNull();
  });

  it("marks the current view and style, and reports a new choice", () => {
    const { onMapView, onMapStyle } = setup("both");
    expect(screen.getByRole("button", { name: "Both" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Heat" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onMapView).toHaveBeenCalledWith("back");
    fireEvent.click(screen.getByRole("button", { name: "Outline" }));
    expect(onMapStyle).toHaveBeenCalledWith("outline");
  });

  it("lists the tracked muscles in the legend", () => {
    setup("both");
    for (const name of ["Chest", "Lats", "Quads", "Calves", "Neck"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe("VolumeInsightCard", () => {
  it("says there is nothing to report until something stands out", () => {
    const { container } = render(<VolumeInsightCard rest={[]} push={[]} />);
    expect(screen.getByText(/Nothing stands out yet/)).toBeInTheDocument();
    expect(container.textContent).not.toContain("Rest these");
    expect(container.textContent).not.toContain("Push these");
  });

  it("names the muscles to rest and the ones to push", () => {
    const { container } = render(
      <VolumeInsightCard rest={["Chest", "Triceps"]} push={["Calves"]} />,
    );
    expect(container).toHaveTextContent("Rest these — Chest, Triceps are well-trained this week.");
    expect(container).toHaveTextContent("Push these — Calves are lagging.");
    expect(screen.queryByText(/Nothing stands out yet/)).toBeNull();
  });

  it("shows only the line it has muscles for", () => {
    const { container } = render(<VolumeInsightCard rest={[]} push={["Hamstrings"]} />);
    expect(container).toHaveTextContent("Push these — Hamstrings");
    expect(container.textContent).not.toContain("Rest these");
  });
});

describe("StatTiles", () => {
  it("shows the streak, the week's sets and today's volume in the user's unit", () => {
    render(<StatTiles streak={4} weekSets={17} volume={2072} unit="lb" />);
    const tile = (label: string) => screen.getByText(label).parentElement;

    expect(tile("day streak")).toHaveTextContent("4");
    expect(tile("sets this week")).toHaveTextContent("17");
    expect(tile("lb lifted today")).toHaveTextContent((2072).toLocaleString());
    expect(screen.queryByText("kg lifted today")).toBeNull();
  });
});

describe("TodayScreen", () => {
  const props = (vm: TodayVM, over: Partial<TodayScreenProps> = {}): TodayScreenProps => ({
    vm,
    coverage: coverage(),
    mapView: "both",
    mapStyle: "heat",
    insightRest: ["Chest"],
    insightPush: [],
    onStart: vi.fn(),
    onSnooze: vi.fn(),
    onLogOther: vi.fn(),
    onToggleSkip: vi.fn(),
    onMapView: vi.fn(),
    onMapStyle: vi.fn(),
    ...over,
  });

  it("puts the hero, the queue, coverage, insight and stats on one screen", () => {
    const { container } = render(<TodayScreen {...props(midSession())} />);
    expect(screen.getByText("UP NEXT · SET 2 OF 3")).toBeInTheDocument();
    expect(screen.getByText("Today's rhythm")).toBeInTheDocument();
    expect(screen.getByText("Muscle coverage")).toBeInTheDocument();
    expect(container).toHaveTextContent("Rest these — Chest");
    expect(screen.getByText("kg lifted today")).toBeInTheDocument();
  });

  it("the hero starts whatever is next; a queue row starts that exercise", () => {
    const onStart = vi.fn();
    render(<TodayScreen {...props(midSession(), { onStart })} />);

    fireEvent.click(screen.getByRole("button", { name: "Start set" }));
    expect(onStart).toHaveBeenLastCalledWith();

    const plank = screen.getByText("Plank").closest<HTMLElement>("[data-state]");
    fireEvent.click(within(plank!).getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenLastCalledWith("p-plank");
  });

  it("passes skip, snooze and log-other through to the caller", () => {
    const p = props(midSession());
    render(<TodayScreen {...p} />);

    const row = screen.getByText("Barbell Row").closest<HTMLElement>("[data-state]");
    fireEvent.click(within(row!).getByRole("button", { name: "Skip" }));
    expect(p.onToggleSkip).toHaveBeenCalledWith("p-row");

    fireEvent.click(screen.getByRole("button", { name: /snooze/i }));
    expect(p.onSnooze).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Log something else" }));
    expect(p.onLogOther).toHaveBeenCalledTimes(1);
  });

  it("hides the queue on a rest day", () => {
    const restDay = todayVM({ program: pushDay(), now: nov(17, 10, 30) });
    render(<TodayScreen {...props(restDay)} />);
    expect(screen.getByText("Rest day")).toBeInTheDocument();
    expect(screen.queryByText("Today's rhythm")).toBeNull();
    expect(screen.getByText("Muscle coverage")).toBeInTheDocument();
  });
});
