import { render, screen } from "@testing-library/react";
import { BrandMark, COLOR, Icon } from "@nabd/design-system";
import { renderRoot } from "./render";

describe("Icon", () => {
  it("is decorative unless it is given a label", () => {
    expect(renderRoot(<Icon name="check" />)).toHaveAttribute("aria-hidden", "true");
    render(<Icon name="check" ariaLabel="complete" />);
    expect(screen.getByRole("img", { name: "complete" })).toBeInTheDocument();
  });

  it("takes its colour from the text unless a tone is given", () => {
    expect(renderRoot(<Icon name="plus" />)).toHaveAttribute("stroke", "currentColor");
    expect(renderRoot(<Icon name="plus" tone="accent" />)).toHaveAttribute("stroke", COLOR.accent);
    expect(renderRoot(<Icon name="plus" tone="faint" />)).toHaveAttribute(
      "stroke",
      COLOR.textFaint,
    );
  });
});

describe("BrandMark", () => {
  it("is the Nabd logo, drawn as one labelled image", () => {
    render(<BrandMark />);
    const mark = screen.getByRole("img", { name: "Nabd" });
    expect(mark.querySelector("svg")).not.toBeNull();
  });
});
