/**
 * B22 · @nabd/modals — FullHistoryChartModal: the dialog that draws a chart
 * view-model.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { FullHistoryChartModal, buildChartVM } from "@nabd/modals";
import { benchHistory, trendOf } from "./chart-fixtures";

describe("FullHistoryChartModal", () => {
  const setup = () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"));
    const onClose = vi.fn();
    render(<FullHistoryChartModal vm={vm} onClose={onClose} />);
    return { vm, onClose };
  };

  it("is a dialog titled with the exercise, saying how far back it goes", () => {
    const { vm } = setup();
    const dialog = screen.getByRole("dialog", { name: "Bench Press" });
    expect(dialog).toHaveTextContent("Full history");
    expect(dialog).toHaveTextContent(vm.subtitle);
  });

  it("shows the headline numbers, each under its label", () => {
    setup();
    const tile = (label: string) => screen.getByText(label).parentElement;

    expect(tile("Personal best")).toHaveTextContent("79.2 kg e1RM");
    expect(tile("Current")).toHaveTextContent("79.2 kg e1RM");
    expect(tile("All-time gain")).toHaveTextContent("+3.2 kg e1RM");
  });

  it("draws the trend with labelled gridlines, from the first date to now", () => {
    const { vm } = setup();
    const chart = screen.getByRole("img", { name: vm.chartLabel });

    expect(chart.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(3);
    expect([...chart.querySelectorAll("text")].map((label) => label.textContent)).toEqual([
      "79.2",
      "77.6",
      "76",
    ]);
    expect(screen.getByText(vm.startLabel)).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("closes from the ✕ and from the backdrop", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
