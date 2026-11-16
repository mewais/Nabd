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

  it("lets the caller drop the padding for edge-to-edge content", () => {
    expect(renderRoot(<Card padding={0}>rows</Card>).style.padding).toBe("0px");
  });
});

describe("Eyebrow", () => {
  it("renders its text upper-cased by style, so copy stays in plain case", () => {
    const eyebrow = renderRoot(<Eyebrow>Logged today</Eyebrow>);
    expect(eyebrow).toHaveTextContent("Logged today");
    expect(eyebrow.style.textTransform).toBe("uppercase");
  });

  it("takes the accent colour when asked", () => {
    const muted = renderRoot(<Eyebrow>a</Eyebrow>).style.color;
    const accent = renderRoot(<Eyebrow tone="accent">a</Eyebrow>).style.color;
    expect(accent).toBe("var(--accent)");
    expect(muted).not.toBe(accent);
  });
});

describe("Page", () => {
  it("scrolls, and caps the width of its content column", () => {
    const page = renderRoot(<Page maxWidth={1100}>screen</Page>);
    expect(page.style.overflow).toBe("auto");
    expect(page).toHaveTextContent("screen");
    expect((page.firstElementChild as HTMLElement).style.maxWidth).toBe("1100px");
  });
});
