import { render } from "@testing-library/react";
import type { GlassBackdrop } from "@nabd/domain";
import { COLOR, LiveDot, ModalShell, ThemeProvider, ToastFrame } from "@nabd/design-system";
import { renderRoot } from "./render";

const root = (theme: "light" | "dark", glass: GlassBackdrop | null, opacity = 0.7): HTMLElement =>
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
    expect(root("light", null)).toHaveAttribute("data-theme", "light");
    expect(root("dark", "blurred")).toHaveAttribute("data-glass", "on");
    expect(root("dark", "seeThrough")).toHaveAttribute("data-glass", "on");
    expect(root("dark", null)).toHaveAttribute("data-glass", "off");
  });

  it.each([
    ["light", null],
    ["dark", null],
    ["light", "blurred"],
    ["dark", "seeThrough"],
  ] as const)("defines every colour token for %s (glass: %s)", (theme, glass) => {
    const style = root(theme, glass).style;
    const tokens = glass === null ? [...TOKENS, "--bg"] : TOKENS;
    for (const token of tokens) expect(style.getPropertyValue(token), token).not.toBe("");
  });

  it("paints the solid background from the theme", () => {
    expect(root("dark", null).style.background).toBe(COLOR.bg);
  });

  /** The alpha of the glass tint the root paints. */
  const tintAlpha = (glass: GlassBackdrop, opacity: number, theme: "dark" | "light" = "dark") =>
    Number(
      /,([\d.]+)\)$/.exec(root(theme, glass, opacity).style.background.replace(/\s/g, ""))?.[1],
    );

  it("paints a frosted tint as strong as the opacity setting over a blurred backdrop", () => {
    expect(tintAlpha("blurred", 0.8)).toBe(0.8);
    expect(tintAlpha("blurred", 0.3, "light")).toBe(0.3);
    // Each theme frosts with its own tint.
    expect(root("dark", "blurred", 0.5).style.background).not.toBe(
      root("light", "blurred", 0.5).style.background,
    );
    expect(root("dark", "blurred", 0.8).style.backdropFilter).not.toBe("");
  });

  it("paints a heavier tint over a sharp backdrop, which every step of the setting still changes", () => {
    const settings = [0.1, 0.4, 0.7, 0.95];
    const sharp = settings.map((opacity) => tintAlpha("seeThrough", opacity));
    // Never thinner than half opaque, and solid at the top of the range.
    expect(sharp[0]).toBeGreaterThanOrEqual(0.5);
    expect(tintAlpha("seeThrough", 1)).toBe(1);
    sharp.forEach((alpha, i) => {
      expect(alpha).toBeGreaterThan(tintAlpha("blurred", settings[i]!));
      if (i > 0) expect(alpha).toBeGreaterThan(sharp[i - 1]!);
    });
  });

  it("ships the keyframes of every animation its primitives play", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={null} opacity={1}>
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
    const { container } = render(<ThemeProvider theme="dark" glass={null} opacity={1} />);
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css.match(/:focus-visible[^{]*\{[^}]*outline:/g)).toHaveLength(1);
    expect(css).not.toMatch(/:focus\s*\{[^}]*outline: \d/);
  });
});
