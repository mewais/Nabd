import { render, screen } from "@testing-library/react";
import { ANIMATION, ThemeProvider } from "@nabd/design-system";
import { renderRoot } from "./render";

const root = (theme: "light" | "dark", glass: boolean, opacity = 0.7): HTMLElement =>
  renderRoot(
    <ThemeProvider theme={theme} glass={glass} opacity={opacity}>
      content
    </ThemeProvider>,
  );

const TOKENS = [
  "--bg",
  "--surface",
  "--surface2",
  "--line",
  "--text",
  "--text2",
  "--text3",
  "--accent",
  "--accent2",
  "--accent3",
  "--map-muscle",
  "--glow",
  "--cardshadow",
  "--modal-bg",
];

describe("ThemeProvider", () => {
  it("renders its children", () => {
    root("dark", false);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("tags the root with the theme and the glass mode", () => {
    expect(root("light", false)).toHaveAttribute("data-theme", "light");
    expect(root("dark", true)).toHaveAttribute("data-glass", "on");
    expect(root("dark", false)).toHaveAttribute("data-glass", "off");
  });

  it.each([
    ["light", false],
    ["dark", false],
    ["light", true],
    ["dark", true],
  ] as const)("defines every colour token for %s (glass: %s)", (theme, glass) => {
    const style = root(theme, glass).style;
    for (const token of TOKENS) expect(style.getPropertyValue(token), token).not.toBe("");
  });

  it("gives each of the four materials its own palette", () => {
    const surfaces = [
      root("light", false),
      root("dark", false),
      root("light", true),
      root("dark", true),
    ].map((element) => element.style.getPropertyValue("--surface"));
    expect(new Set(surfaces).size).toBe(4);
  });

  it("paints the solid background from the theme", () => {
    expect(root("dark", false).style.background).toBe("var(--bg)");
  });

  it("paints a frosted tint as strong as the opacity setting in glass mode", () => {
    const dark = root("dark", true, 0.8).style;
    expect(dark.background.replace(/\s/g, "")).toBe("rgba(15,17,24,0.8)");
    expect(dark.backdropFilter).toContain("blur");

    const light = root("light", true, 0.3).style;
    expect(light.background.replace(/\s/g, "")).toBe("rgba(244,246,251,0.3)");
  });

  it("ships the keyframes every named animation refers to", () => {
    const { container } = render(<ThemeProvider theme="dark" glass={false} opacity={1} />);
    const css = container.querySelector("style")?.textContent ?? "";
    for (const animation of Object.values(ANIMATION)) {
      expect(css).toContain(`@keyframes ${animation.split(" ")[0]}`);
    }
  });
});
