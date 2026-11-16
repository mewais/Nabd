// Renders the Today screen for a view-model, with every action a spy.

import { render, screen, within } from "@testing-library/react";
import { TodayScreen } from "@nabd/today";
import type { TodayActions, TodayVM } from "@nabd/today";

export function renderToday(vm: TodayVM): { actions: TodayActions; container: HTMLElement } {
  const actions: TodayActions = {
    start: vi.fn(),
    snooze: vi.fn(),
    logOther: vi.fn(),
    toggleSkip: vi.fn(),
    setMapView: vi.fn(),
    setMapStyle: vi.fn(),
  };
  const { container } = render(<TodayScreen vm={vm} actions={actions} />);
  return { actions, container };
}

/** Queries scoped to the queue card. */
export function queueCard() {
  return within(screen.getByRole("region", { name: "Today's rhythm" }));
}

/** Queries scoped to the queue row of one exercise. */
export function queueRow(exercise: string) {
  return within(queueCard().getByRole("listitem", { name: exercise }));
}

/** Queries scoped to the card that presents the next set. */
export function nextSetCard() {
  return within(screen.getByRole("region", { name: "Next set" }));
}
