import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CompletionCard,
  ConsistencyCard,
  KpiStrip,
  MuscleHeatmapCard,
  ProgressScreen,
  ProgressionCard,
  TimeOfDayCard,
  TriggerCard,
} from "@nabd/progress";
import { BENCH, NO_COVERAGE, PLANK, PULL_UP, progressVM } from "./fixtures";

describe("KpiStrip", () => {
  it("shows each KPI's label, value and unit", () => {
    render(<KpiStrip kpis={progressVM().kpis} />);

    for (const label of [
      "Current streak",
      "Completion this wk",
      "Sets this week",
      "Active days 30d",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByText("sets")).toBeInTheDocument();
    expect(screen.getAllByText("days")).toHaveLength(2);
  });

  it("shows every value even when two KPIs share the same one", () => {
    // Regression: a duplicated value used to be rendered only once.
    render(
      <KpiStrip
        kpis={[
          { label: "Current streak", value: "4", unit: "days" },
          { label: "Completion this wk", value: "0", unit: "%" },
          { label: "Sets this week", value: "0", unit: "sets" },
          { label: "Active days 30d", value: "4", unit: "days" },
        ]}
      />,
    );

    expect(screen.getAllByText("4")).toHaveLength(2);
    expect(screen.getAllByText("0")).toHaveLength(2);
    const streakTile = screen.getByText("Current streak").parentElement!;
    const activeTile = screen.getByText("Active days 30d").parentElement!;
    expect(within(streakTile).getByText("4")).toBeInTheDocument();
    expect(within(activeTile).getByText("4")).toBeInTheDocument();
  });
});

describe("ConsistencyCard", () => {
  const { calendar, weekly } = progressVM();

  it("on the calendar tab shows the month and numbers past days only", () => {
    render(<ConsistencyCard tab="calendar" onTab={vi.fn()} calendar={calendar} weekly={weekly} />);

    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // today
    expect(screen.queryByText("19")).not.toBeInTheDocument(); // future
    expect(screen.queryByText("30")).not.toBeInTheDocument();
    expect(screen.queryByText("This wk")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("on the weekly tab shows a labelled bar per week with its set count", () => {
    render(<ConsistencyCard tab="weekly" onTab={vi.fn()} calendar={calendar} weekly={weekly} />);

    expect(screen.getByText("Sets per week · last 8 weeks")).toBeInTheDocument();
    for (const label of ["Sep 28", "Oct 19", "Nov 9", "This wk"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("6")).toBeInTheDocument(); // this week
    expect(screen.getByText("2")).toBeInTheDocument(); // last week
    expect(screen.queryByText("0")).not.toBeInTheDocument(); // empty weeks carry no number
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");
  });

  it("asks for the other tab when it is clicked", () => {
    const onTab = vi.fn();
    render(<ConsistencyCard tab="calendar" onTab={onTab} calendar={calendar} weekly={weekly} />);

    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(onTab).toHaveBeenLastCalledWith("weekly");

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onTab).toHaveBeenLastCalledWith("calendar");
    expect(onTab).toHaveBeenCalledTimes(2);
  });
});

describe("CompletionCard", () => {
  it("shows this week's percentage and a labelled bar for each of the last seven days", () => {
    const { completion } = progressVM();
    const { container } = render(
      <CompletionCard weekPct={completion.weekPct} days={completion.days} />,
    );

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("LAST 7 DAYS")).toBeInTheDocument();
    expect(screen.getAllByText("T")).toHaveLength(2);
    expect(screen.getAllByText("S")).toHaveLength(2);
    for (const initial of ["M", "W", "F"]) {
      expect(screen.getByText(initial)).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".day-bar")).toHaveLength(7);
  });
});

describe("TimeOfDayCard", () => {
  it("calls out the peak hour once and labels the other hours", () => {
    const { timeOfDay } = progressVM();
    const { container } = render(
      <TimeOfDayCard bars={timeOfDay.bars} peakLabel={timeOfDay.peakLabel} />,
    );

    expect(screen.getByText("Peak")).toBeInTheDocument();
    expect(screen.getByText("9a")).toBeInTheDocument(); // in the callout only
    for (const label of ["12a", "8a", "12p", "6p", "11p"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".tod-bar")).toHaveLength(24);
  });
});

describe("TriggerCard", () => {
  it("lists every trigger with its share", () => {
    render(<TriggerCard segments={progressVM().triggers} />);

    const share = (label: string) => screen.getByText(label).parentElement!;
    expect(share("Idle detected")).toHaveTextContent("56%");
    expect(share("Timer")).toHaveTextContent("22%");
    expect(share("Manual")).toHaveTextContent("22%");
  });
});

describe("MuscleHeatmapCard", () => {
  it("shows the front and back body maps", () => {
    const { container } = render(
      <MuscleHeatmapCard coverage={{ ...NO_COVERAGE, chest: 80, lats: 40 }} />,
    );

    expect(screen.getByText("Sets per muscle")).toBeInTheDocument();
    expect(screen.getByText("FRONT")).toBeInTheDocument();
    expect(screen.getByText("BACK")).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });
});

describe("ProgressionCard", () => {
  const rows = progressVM().progression;
  const rowOf = (name: string): HTMLElement => screen.getByText(name).parentElement!;

  it("shows each exercise with its best and its gain", () => {
    render(<ProgressionCard rows={rows} onOpenChart={vi.fn()} />);

    expect(rowOf("Barbell Bench Press")).toHaveTextContent("76 kg e1RM");
    expect(rowOf("Barbell Bench Press")).toHaveTextContent("+6.3 kg e1RM");
    expect(rowOf("Pull-Up")).toHaveTextContent("10 reps");
    expect(rowOf("Pull-Up")).toHaveTextContent("+2 reps");
    expect(rowOf("Plank")).toHaveTextContent("-15");
  });

  it("draws each row's sparkline from its points", () => {
    render(<ProgressionCard rows={rows} onOpenChart={vi.fn()} />);

    const line = rowOf("Barbell Bench Press").querySelector("polyline");
    expect(line).toHaveAttribute("points", rows.find((r) => r.exId === BENCH)!.points);
  });

  it("opens the chart of the exercise whose row is clicked", () => {
    const onOpenChart = vi.fn();
    render(<ProgressionCard rows={rows} onOpenChart={onOpenChart} />);

    fireEvent.click(screen.getByText("Pull-Up"));
    expect(onOpenChart).toHaveBeenLastCalledWith(PULL_UP);

    fireEvent.click(screen.getByText("+6.3 kg e1RM")); // anywhere in the row
    expect(onOpenChart).toHaveBeenLastCalledWith(BENCH);
    expect(onOpenChart).toHaveBeenCalledTimes(2);
  });

  it("shows just the headings when there is no history yet", () => {
    const onOpenChart = vi.fn();
    const { container } = render(<ProgressionCard rows={[]} onOpenChart={onOpenChart} />);

    expect(screen.getByText("Progression & records")).toBeInTheDocument();
    expect(screen.getByText("EXERCISE")).toBeInTheDocument();
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });
});

describe("ProgressScreen", () => {
  function renderScreen(tab: "calendar" | "weekly" = "calendar", vm = progressVM()) {
    const onTab = vi.fn();
    const onOpenChart = vi.fn();
    render(
      <ProgressScreen
        vm={vm}
        coverage={NO_COVERAGE}
        tab={tab}
        onTab={onTab}
        onOpenChart={onOpenChart}
      />,
    );
    return { onTab, onOpenChart };
  }

  it("puts every section of the view model on screen", () => {
    renderScreen();

    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Current streak")).toBeInTheDocument();
    expect(screen.getByText("Consistency")).toBeInTheDocument();
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("Completion rate")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Time of day")).toBeInTheDocument();
    expect(screen.getByText("9a")).toBeInTheDocument();
    expect(screen.getByText("What prompts a set")).toBeInTheDocument();
    expect(screen.getByText("56%")).toBeInTheDocument();
    expect(screen.getByText("Sets per muscle")).toBeInTheDocument();
    expect(screen.getByText("Barbell Bench Press")).toBeInTheDocument();
  });

  it("clicking an exercise row opens that exercise's chart", () => {
    const { onOpenChart, onTab } = renderScreen();

    fireEvent.click(screen.getByText("Plank"));

    expect(onOpenChart).toHaveBeenCalledTimes(1);
    expect(onOpenChart).toHaveBeenCalledWith(PLANK);
    expect(onTab).not.toHaveBeenCalled();
  });

  it("toggling the consistency tab reports the tab that was asked for", () => {
    const { onTab, onOpenChart } = renderScreen("calendar");

    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));

    expect(onTab).toHaveBeenCalledWith("weekly");
    expect(onOpenChart).not.toHaveBeenCalled();
    // the screen is controlled: it keeps showing the tab it was given
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });

  it("shows the weekly chart when given the weekly tab", () => {
    const { onTab } = renderScreen("weekly");

    expect(screen.getByText("This wk")).toBeInTheDocument();
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onTab).toHaveBeenCalledWith("calendar");
  });

  it("renders for a brand-new user with no history", () => {
    const { onOpenChart } = renderScreen("calendar", progressVM([], []));

    // completion this week + the three trigger shares
    expect(screen.getAllByText("0%")).toHaveLength(4);
    expect(screen.getByText("Progression & records")).toBeInTheDocument();
    expect(onOpenChart).not.toHaveBeenCalled();
  });
});
