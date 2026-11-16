import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProgressScreen } from "@nabd/progress";
import { BENCH, NEW_USER, NO_COVERAGE, PLANK, PULL_UP, progressVM } from "./fixtures";
import type { Scenario } from "./fixtures";

function renderScreen(scenario: Scenario = {}) {
  const actions = { setTab: vi.fn(), openChart: vi.fn() };
  render(<ProgressScreen vm={progressVM(scenario)} actions={actions} />);
  return actions;
}

const bars = (chart: string): HTMLElement[] =>
  within(screen.getByRole("list", { name: chart })).getAllByRole("listitem");
const row = (exercise: string | RegExp): HTMLElement =>
  screen.getByRole("button", { name: exercise });

describe("ProgressScreen — KPIs", () => {
  it("shows each KPI's label, value and unit", () => {
    renderScreen();

    const tile = (label: string): HTMLElement => screen.getByRole("region", { name: label });
    expect(tile("Current streak")).toHaveTextContent("3days");
    expect(tile("Completion this wk")).toHaveTextContent("50%");
    expect(tile("Sets this week")).toHaveTextContent("6sets");
    expect(tile("Active days 30d")).toHaveTextContent("4days");
  });
});

describe("ProgressScreen — consistency", () => {
  it("on the calendar tab shows the month and numbers past days only", () => {
    renderScreen();

    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // today
    expect(screen.queryByText("19")).not.toBeInTheDocument(); // future
    expect(screen.queryByText("30")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Sets per week" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Calendar" })).toHaveAttribute("aria-checked", "true");
  });

  it("on the weekly tab shows a captioned bar per week with its set count", () => {
    renderScreen({ tab: "weekly" });

    expect(screen.getByText("Sets per week · last 8 weeks")).toBeInTheDocument();
    expect(bars("Sets per week").map((bar) => bar.textContent)).toEqual([
      "Sep 28",
      "Oct 5",
      "Oct 12",
      "1Oct 19",
      "Oct 26",
      "Nov 2",
      "2Nov 9",
      "6This wk",
    ]);
    expect(bars("Sets per week").at(-1)).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Weekly" })).toBeChecked();
  });

  it("asks for the tab that is clicked and keeps showing the one it was given", () => {
    const actions = renderScreen();
    const tabs = within(screen.getByRole("radiogroup", { name: "Consistency view" }));

    fireEvent.click(tabs.getByRole("radio", { name: "Weekly" }));
    expect(actions.setTab).toHaveBeenLastCalledWith("weekly");

    fireEvent.click(tabs.getByRole("radio", { name: "Calendar" }));
    expect(actions.setTab).toHaveBeenLastCalledWith("calendar");
    expect(actions.setTab).toHaveBeenCalledTimes(2);
    expect(actions.openChart).not.toHaveBeenCalled();
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });
});

describe("ProgressScreen — completion", () => {
  it("shows this week's percentage and a bar for each of the last seven days", () => {
    renderScreen();

    expect(screen.getByRole("region", { name: "Completion rate" })).toHaveTextContent(
      "50%this week",
    );
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(bars("Completion by day").map((bar) => bar.textContent)).toEqual(
      ["T", "F", "S", "S", "M", "T", "W"], // prettier-ignore
    );
    expect(bars("Completion by day").at(-1)).toHaveAttribute("aria-current", "true");
  });
});

describe("ProgressScreen — time of day", () => {
  it("draws a bar per hour and calls out the peak", () => {
    renderScreen();

    expect(screen.getByText("Peak 9a")).toBeInTheDocument();
    expect(bars("Sets by hour")).toHaveLength(24);
    expect(bars("Sets by hour")[9]).toHaveAttribute("aria-current", "true");
    expect(bars("Sets by hour")[10]).not.toHaveAttribute("aria-current");
  });
});

describe("ProgressScreen — triggers", () => {
  it("lists every trigger with its share", () => {
    renderScreen();

    const share = (label: string) => screen.getByRole("listitem", { name: label });
    expect(share("Idle detected")).toHaveTextContent("56%");
    expect(share("Timer")).toHaveTextContent("22%");
    expect(share("Manual")).toHaveTextContent("22%");
  });
});

describe("ProgressScreen — muscle coverage", () => {
  it("shows both body maps and a meter for each trained muscle", () => {
    renderScreen({ coverage: { ...NO_COVERAGE, chest: 80, lats: 40 } });

    expect(screen.getByText("Sets per muscle")).toBeInTheDocument();
    expect(screen.getByText("front")).toBeInTheDocument();
    expect(screen.getByText("back")).toBeInTheDocument();
    expect(screen.getAllByRole("meter").map((meter) => meter.getAttribute("aria-label"))).toEqual([
      "Chest",
      "Lats",
    ]);
    expect(screen.getByRole("meter", { name: "Chest" })).toHaveAttribute("aria-valuenow", "80");
    expect(screen.getByText("Rest")).toBeInTheDocument(); // chest is well covered
  });

  it("says so when nothing was trained in the window", () => {
    renderScreen();

    expect(screen.getByText("No sets in the last 7 days.")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });
});

describe("ProgressScreen — progression", () => {
  it("shows each exercise with its trend line, best and gain", () => {
    renderScreen();

    expect(row(/Barbell Bench Press/)).toHaveTextContent("76 kg e1RM");
    expect(row(/Barbell Bench Press/)).toHaveTextContent("+6.3 kg e1RM");
    expect(row(/Pull-Up/)).toHaveTextContent("10 reps");
    expect(row(/Pull-Up/)).toHaveTextContent("+2 reps");
    expect(row(/Plank/)).toHaveTextContent("-15");
    // one point per session
    const line = row(/Barbell Bench Press/)
      .querySelector("polyline")
      ?.getAttribute("points");
    expect(line?.split(" ")).toHaveLength(3);
  });

  it("opens the full history of the exercise whose row is clicked", () => {
    const actions = renderScreen();

    fireEvent.click(row(/Pull-Up/));
    expect(actions.openChart).toHaveBeenLastCalledWith(PULL_UP);

    fireEvent.click(screen.getByText("+6.3 kg e1RM")); // anywhere in the row
    expect(actions.openChart).toHaveBeenLastCalledWith(BENCH);

    fireEvent.click(screen.getByText("Plank"));
    expect(actions.openChart).toHaveBeenLastCalledWith(PLANK);
    expect(actions.openChart).toHaveBeenCalledTimes(3);
    expect(actions.setTab).not.toHaveBeenCalled();
  });
});

describe("ProgressScreen — a new user", () => {
  it("explains what will appear instead of showing empty charts and tables", () => {
    renderScreen(NEW_USER);

    expect(screen.getByText(/^Nothing planned yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/^No sets logged yet/)).toHaveLength(3);
    expect(screen.getByText("No sets in the last 7 days.")).toBeInTheDocument();
    // no charts, no peak badge, no table headings, no rows
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Peak/)).not.toBeInTheDocument();
    expect(screen.queryByText("Exercise")).not.toBeInTheDocument();
    expect(screen.queryByText("this week")).not.toBeInTheDocument();
    // the calendar still shows the month so far
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("still offers the weekly view, with eight empty weeks", () => {
    renderScreen({ ...NEW_USER, tab: "weekly" });

    expect(bars("Sets per week")).toHaveLength(8);
    expect(bars("Sets per week").at(-1)).toHaveTextContent(/^This wk$/);
  });
});
