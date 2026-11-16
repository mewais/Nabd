/**
 * B19 · @nabd/today — the headline card: the next set and the ways to act on
 * it, or the reason there is nothing to do.
 */

import { fireEvent, screen } from "@testing-library/react";
import { EMPTY_PROGRAM } from "@nabd/domain";
import type { TodayVM } from "@nabd/today";
import { did, mondayProgram, planRow, work } from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";
import { lastWeek, nudgeAt, pushDay, todayVM } from "./fixtures";
import { nextSetCard, renderToday } from "./render";

/** Monday after the bench warm-up: a working set is next and a nudge is due. */
const midSession = (): TodayVM =>
  todayVM(
    {
      program: pushDay(),
      history: [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })],
    },
    { nudge: nudgeAt(nov(16, 10, 30)) },
  );

/** Monday before the warm-up, ten minutes after a set: the next nudge is still to come. */
const waiting = (): TodayVM =>
  todayVM(
    { program: pushDay(), history: lastWeek() },
    { nudge: nudgeAt(nov(16, 10, 30), { lastSetAt: nov(16, 10, 20) }) },
  );

const click = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};

describe("Today · next set", () => {
  it("presents the next set: exercise, position, target, muscles, notes and advice", () => {
    const { container } = renderToday(midSession());
    const card = nextSetCard();

    expect(card.getByText("Bench Press")).toBeInTheDocument();
    expect(card.getByText("Up next · Set 2 of 3")).toBeInTheDocument();
    expect(card.getByText("Working set · 8–12 reps · RPE 8")).toBeInTheDocument();
    expect(card.getByText("Triceps")).toBeInTheDocument();
    expect(card.getByText("Front Delts")).toBeInTheDocument();
    expect(card.getByText("Pause at the chest")).toBeInTheDocument();
    expect(container).toHaveTextContent("Try 9 × 60 kg or 8 × 62.5 kg");
    expect(container).toHaveTextContent("Last time: 8 × 60 kg");
  });

  it("shows no advice for a warm-up", () => {
    const { container } = renderToday(waiting());
    expect(screen.getByText("Warm-up · 10 reps")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Try ");
  });

  it("Start set opens whatever is next", () => {
    const { actions } = renderToday(midSession());
    click("Start set");
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(actions.start).toHaveBeenCalledWith();
    expect(actions.logOther).not.toHaveBeenCalled();
  });

  it("Log something else asks for an exercise outside the plan", () => {
    const { actions } = renderToday(midSession());
    click("Log something else");
    expect(actions.logOther).toHaveBeenCalledTimes(1);
    expect(actions.start).not.toHaveBeenCalled();
  });

  it("offers Snooze, for the app's snooze length, while a nudge is due", () => {
    const { actions } = renderToday(midSession());
    expect(screen.getByText("Interval's up")).toBeInTheDocument();
    click("Snooze 5m");
    expect(actions.snooze).toHaveBeenCalledTimes(1);
  });

  it("offers no Snooze while waiting, and says when the next nudge comes", () => {
    renderToday(waiting());
    expect(screen.queryByRole("button", { name: /snooze/i })).toBeNull();
    expect(screen.getByText("Next nudge at 11:10, sooner if you go idle")).toBeInTheDocument();
  });
});

describe("Today · nothing to do", () => {
  const complete = (): TodayVM =>
    todayVM({
      program: mondayProgram([planRow("p-row", "row", [work(8, 12), work(8, 12)])]),
      history: [did("p-row", "row", 12, 50), did("p-row", "row", 11, 50)],
    });

  it("celebrates a finished day instead of offering a set", () => {
    renderToday(complete());
    expect(screen.getByText("Day complete")).toBeInTheDocument();
    expect(screen.getByText(/All 2 sets logged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start set" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Log something else" })).toBeNull();
  });

  it("explains a rest day, hides the queue and still lets anything be logged", () => {
    const { actions } = renderToday(todayVM({ program: pushDay(), now: nov(17, 10, 30) }));
    expect(screen.getByText("Rest day")).toBeInTheDocument();
    expect(screen.getByText(/Nothing is planned for today/)).toBeInTheDocument();
    expect(screen.queryByText("Today's rhythm")).toBeNull();
    expect(screen.getByText("Muscle coverage")).toBeInTheDocument();

    click("Log something else");
    expect(actions.logOther).toHaveBeenCalledTimes(1);
  });

  it("says so when everything was skipped, with the queue there to restore from", () => {
    const { actions } = renderToday(
      todayVM({ program: pushDay(), skipped: ["p-bench", "p-row", "p-plank"] }),
    );
    expect(screen.getByText("Everything skipped today")).toBeInTheDocument();
    expect(screen.getByText(/Restore an exercise from the queue/)).toBeInTheDocument();
    expect(screen.queryByText("Rest day")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(3);

    click("Log something else");
    expect(actions.logOther).toHaveBeenCalledTimes(1);
  });

  it("points to the Plan screen when there is no program", () => {
    renderToday(todayVM({ program: EMPTY_PROGRAM }));
    expect(screen.getByText("No plan yet")).toBeInTheDocument();
    expect(screen.getByText(/Plan screen/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log something else" })).toBeNull();
  });
});
