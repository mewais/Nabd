import { render } from "@testing-library/react";
import { COLOR, LiveDot, ModalShell, ThemeProvider, ToastFrame } from "@nabd/design-system";
import { renderRoot } from "./render";

const root = (theme: "light" | "dark", glass: boolean, opacity = 0.7): HTMLElement =>
  renderRoot(
    <ThemeProvider theme={theme} glass={glass} opacity={opacity}>
      content
    </ThemeProvider>,
  );

/** The colour tokens every material defines; a solid one defines `--bg` too, which glass paints over. */
const TOKENS = [
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
  "--cardshadow",
  "--modal-bg",
];

describe("ThemeProvider", () => {
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
    const tokens = glass ? TOKENS : [...TOKENS, "--bg"];
    for (const token of tokens) expect(style.getPropertyValue(token), token).not.toBe("");
  });

  it("paints the solid background from the theme", () => {
    expect(root("dark", false).style.background).toBe(COLOR.bg);
  });

  it("paints a frosted tint as strong as the opacity setting in glass mode", () => {
    const tint = (theme: "dark" | "light", opacity: number) =>
      root(theme, true, opacity).style.background.replace(/\s/g, "");
    expect(tint("dark", 0.8)).toMatch(/,0\.8\)$/);
    expect(tint("light", 0.3)).toMatch(/,0\.3\)$/);
    // Each theme frosts with its own tint.
    expect(tint("dark", 0.5)).not.toBe(tint("light", 0.5));
    expect(root("dark", true, 0.8).style.backdropFilter).not.toBe("");
  });

  it("ships the keyframes of every animation its primitives play", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={false} opacity={1}>
        <LiveDot on />
        <ToastFrame>toast</ToastFrame>
        <ModalShell title="Modal" width="sm" onClose={() => undefined} />
      </ThemeProvider>,
    );
    const css = container.querySelector("style")?.textContent ?? "";
    const played = [...document.querySelectorAll<HTMLElement>("[style]")]
      .map((element) => element.style.animation.split(" ")[0])
      .filter((name): name is string => name !== undefined && name !== "");
    expect(new Set(played).size).toBe(3);
    for (const name of played) expect(css).toContain(`@keyframes ${name}`);
  });

  it("draws one focus ring, for keyboard focus only", () => {
    const { container } = render(<ThemeProvider theme="dark" glass={false} opacity={1} />);
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css.match(/:focus-visible[^{]*\{[^}]*outline:/g)).toHaveLength(1);
    expect(css).not.toMatch(/:focus\s*\{[^}]*outline: \d/);
  });
});
