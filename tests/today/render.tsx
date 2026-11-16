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
  const card = screen.getByText("Today's rhythm").parentElement?.parentElement;
  if (!card) throw new Error("no queue on screen");
  return within(card);
}

/** Queries scoped to the queue row of one exercise. */
export function queueRow(exercise: string) {
  const row = queueCard().getByText(exercise).closest<HTMLElement>("[data-state]");
  if (!row) throw new Error(`no queue row for "${exercise}"`);
  return within(row);
}

/** Queries scoped to the card that presents the next set. */
export function nextSetCard() {
  const card = screen.getByRole("button", { name: "Start set" }).parentElement?.parentElement;
  if (!card) throw new Error("no next set on screen");
  return within(card);
}
