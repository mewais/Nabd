import { render, screen } from "@testing-library/react";
import { BrandMark, COLOR, Icon } from "@nabd/design-system";
import type { IconName } from "@nabd/design-system";
import { renderRoot } from "./render";

describe("Icon", () => {
  it("draws the named icon at a step of the size scale", () => {
    const svg = renderRoot(<Icon name="bolt" size="sm" />);
    expect(svg).toHaveAttribute("data-icon", "bolt");
    expect(svg).toHaveAttribute("width", "14");
    expect(svg).toHaveAttribute("height", "14");
    expect(svg.querySelector("path")?.getAttribute("d")).toBeTruthy();
  });

  it("draws different icons differently", () => {
    const path = (name: IconName): string | null | undefined =>
      renderRoot(<Icon name={name} />)
        .querySelector("path")
        ?.getAttribute("d");
    expect(path("check")).not.toBe(path("close"));
  });

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

  it("only accepts names from the set", () => {
    // @ts-expect-error "heart" is not an icon
    const unknown: IconName = "heart";
    expect(unknown).toBe("heart");
  });
});

describe("BrandMark", () => {
  it("is the Nabd logo, drawn as one labelled image", () => {
    render(<BrandMark />);
    const mark = screen.getByRole("img", { name: "Nabd" });
    expect(mark.querySelector("svg")).not.toBeNull();
  });
});
