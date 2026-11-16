import { render, screen } from "@testing-library/react";
import { Card, Eyebrow, Page } from "@nabd/design-system";
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
});

describe("Eyebrow", () => {
  it("keeps its copy in plain case (the upper-casing is only how it is drawn)", () => {
    expect(renderRoot(<Eyebrow>Logged today</Eyebrow>)).toHaveTextContent("Logged today");
  });
});

describe("Page", () => {
  it("holds the screen's content", () => {
    const page = renderRoot(<Page maxWidth={1100}>screen</Page>);
    expect(page).toHaveTextContent("screen");
  });
});
