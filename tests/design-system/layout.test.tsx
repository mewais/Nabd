import { render, screen } from "@testing-library/react";
import { Card, Page, WithSide } from "@nabd/design-system";
import { renderRoot } from "./render";

describe("Card", () => {
  it("renders its content without a header by default", () => {
    const card = renderRoot(<Card>body</Card>);
    expect(card).toHaveTextContent("body");
    expect(card.children).toHaveLength(0);
  });

  it("shows a header with title, subtitle and action when given", () => {
    render(
      <Card title="Consistency" subtitle="Last 8 weeks" action={<button>Weekly</button>}>
        body
      </Card>,
    );
    expect(screen.getByText("Consistency")).toBeInTheDocument();
    expect(screen.getByText("Last 8 weeks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("is a region named by its title, or by its label when it has none", () => {
    render(<Card title="Coverage">body</Card>);
    render(<Card ariaLabel="Up next">body</Card>);
    expect(screen.getByRole("region", { name: "Coverage" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Up next" })).toBeInTheDocument();
  });

  it("is a plain box when nothing names it", () => {
    render(<Card>body</Card>);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("takes a header of its own making in place of the title row", () => {
    render(<Card header={<h3>Custom</h3>}>body</Card>);
    expect(screen.getByRole("heading", { name: "Custom" })).toBeInTheDocument();
  });

  it("pads its content by a step of the scale, or not at all when flush", () => {
    expect(renderRoot(<Card padding="md">body</Card>).style.padding).toBe("12px");
    expect(renderRoot(<Card flush>body</Card>).style.padding).toBe("0px");
  });
});

describe("Page", () => {
  it("holds the screen's content", () => {
    const page = renderRoot(<Page width="sm">screen</Page>);
    expect(page).toHaveTextContent("screen");
  });
});

describe("WithSide", () => {
  it("puts the main pane first, and lets the side pane go under it when the two do not fit", () => {
    const root = renderRoot(
      <WithSide side={<aside>rail</aside>} sideWidth="rail" mainMinWidth="editor">
        <main>editor</main>
      </WithSide>,
    );
    const [main, side] = [...root.children] as HTMLElement[];
    expect(main).toHaveTextContent("editor");
    expect(side).toHaveTextContent("rail");
    expect(root.style.flexWrap).toBe("wrap");
    expect(main!.style.minWidth).toBe("min(480px, 100%)");
    expect(side!.style.flex).toBe("1 1 300px");
  });
});
