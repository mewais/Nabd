/**
 * B16 · @nabd/design-system — theme helpers and presentational primitives.
 */

// React must be in scope for the classic JSX transform used by vitest/esbuild.
// Direct path import is necessary because vite resolves 'react' from the package
// root (packages/B16-design-system) not the test file's directory.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES, GLASS_FROST, materialKey, glassTint } from "@nabd/domain";

import {
  themeVars,
  rootBackgroundStyle,
  ThemeProvider,
  Button,
  Segmented,
  Stepper,
  Toggle,
  AdviceCard,
  Card,
  LiveDot,
  Icon,
  Dropdown,
} from "@nabd/design-system";
import type { AdviceText, IconName } from "@nabd/design-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_ICON_NAMES: IconName[] = [
  "today",
  "plan",
  "progress",
  "settings",
  "bolt",
  "check",
  "close",
  "chevron",
  "trophy",
  "heart",
  "home",
  "download",
  "upload",
];

/** Read a CSS custom property off a style object (not part of CSSProperties' type). */
const cssVar = (style: React.CSSProperties, name: string): unknown =>
  (style as Record<string, unknown>)[name];

// ---------------------------------------------------------------------------
// themeVars
// ---------------------------------------------------------------------------

describe("themeVars", () => {
  test("solid light returns THEMES.light tokens (e.g. --surface)", () => {
    const vars = themeVars("light", false);
    const expected = THEMES[materialKey("light", false)];
    expect(vars).toHaveProperty("--surface", expected["--surface"]);
  });

  test("solid dark returns THEMES.dark tokens (e.g. --surface)", () => {
    const vars = themeVars("dark", false);
    const expected = THEMES[materialKey("dark", false)];
    expect(vars).toHaveProperty("--surface", expected["--surface"]);
  });

  test("glass light returns THEMES.lightGlass tokens", () => {
    const vars = themeVars("light", true);
    const expected = THEMES[materialKey("light", true)];
    expect(vars).toHaveProperty("--surface", expected["--surface"]);
  });

  test("glass dark returns THEMES.darkGlass tokens", () => {
    const vars = themeVars("dark", true);
    const expected = THEMES[materialKey("dark", true)];
    expect(vars).toHaveProperty("--surface", expected["--surface"]);
  });

  test("solid vs glass dark: --surface differs", () => {
    const solid = themeVars("dark", false);
    const glass = themeVars("dark", true);
    expect(cssVar(solid, "--surface")).not.toBe(cssVar(glass, "--surface"));
  });

  test("solid vs glass light: --surface differs", () => {
    const solid = themeVars("light", false);
    const glass = themeVars("light", true);
    expect(cssVar(solid, "--surface")).not.toBe(cssVar(glass, "--surface"));
  });

  test("glass dark has --glow token (not 'none')", () => {
    const vars = themeVars("dark", true);
    // darkGlass --glow is an inset shadow (not 'none')
    expect(cssVar(vars, "--glow")).not.toBe("none");
  });

  test("glass light has --glow token (not 'none')", () => {
    const vars = themeVars("light", true);
    // lightGlass --glow is an inset shadow (not 'none')
    expect(cssVar(vars, "--glow")).not.toBe("none");
  });

  test("solid dark has --glow = 'none' (no glow for solid)", () => {
    const vars = themeVars("dark", false);
    expect(cssVar(vars, "--glow")).toBe("none");
  });

  test("solid light has --glow = 'none' (no glow for solid)", () => {
    const vars = themeVars("light", false);
    expect(cssVar(vars, "--glow")).toBe("none");
  });

  test("glass dark has --cardshadow matching THEMES.darkGlass", () => {
    const vars = themeVars("dark", true);
    expect(cssVar(vars, "--cardshadow")).toBe(THEMES.darkGlass["--cardshadow"]);
  });

  test("all four materials return all 13 CSS custom properties", () => {
    const minKeys = 13;
    expect(Object.keys(themeVars("light", false)).length).toBeGreaterThanOrEqual(minKeys);
    expect(Object.keys(themeVars("dark", false)).length).toBeGreaterThanOrEqual(minKeys);
    expect(Object.keys(themeVars("light", true)).length).toBeGreaterThanOrEqual(minKeys);
    expect(Object.keys(themeVars("dark", true)).length).toBeGreaterThanOrEqual(minKeys);
  });
});

// ---------------------------------------------------------------------------
// rootBackgroundStyle
// ---------------------------------------------------------------------------

describe("rootBackgroundStyle", () => {
  test("glass:false, light → background is var(--bg)", () => {
    const style = rootBackgroundStyle("light", false, 0.55);
    expect(style).toHaveProperty("background", "var(--bg)");
  });

  test("glass:false, dark → background is var(--bg)", () => {
    const style = rootBackgroundStyle("dark", false, 0.55);
    expect(style).toHaveProperty("background", "var(--bg)");
  });

  test("glass:false, light → no backdropFilter", () => {
    const style = rootBackgroundStyle("light", false, 0.55);
    expect(style).not.toHaveProperty("backdropFilter");
  });

  test("glass:false, dark → no backdropFilter", () => {
    const style = rootBackgroundStyle("dark", false, 0.55);
    expect(style).not.toHaveProperty("backdropFilter");
  });

  test("glass:true, dark → background contains rgba(15,17,24,", () => {
    const style = rootBackgroundStyle("dark", true, 0.7);
    expect(style.background as string).toContain("rgba(15,17,24,");
  });

  test("glass:true, light → background contains rgba(244,246,251,", () => {
    const style = rootBackgroundStyle("light", true, 0.7);
    expect(style.background as string).toContain("rgba(244,246,251,");
  });

  test("glass:true, dark → backdropFilter is GLASS_FROST", () => {
    const style = rootBackgroundStyle("dark", true, 0.7);
    expect(style).toHaveProperty("backdropFilter", GLASS_FROST);
  });

  test("glass:true, dark → WebkitBackdropFilter equals GLASS_FROST", () => {
    const style = rootBackgroundStyle("dark", true, 0.7);
    expect(style).toHaveProperty("WebkitBackdropFilter", GLASS_FROST);
  });

  test("glass:true, light → backdropFilter is GLASS_FROST", () => {
    const style = rootBackgroundStyle("light", true, 0.7);
    expect(style).toHaveProperty("backdropFilter", GLASS_FROST);
  });

  test("relaxed floor: dark glass opacity 0.3 passes through → rgba(15,17,24,0.3)", () => {
    const style = rootBackgroundStyle("dark", true, 0.3);
    // floor is now 0.1, so opacity 0.3 is no longer clamped
    expect(style.background as string).toBe(glassTint("dark", 0.3));
    expect(style.background as string).toContain("rgba(15,17,24,0.3)");
  });

  test("relaxed floor: light glass opacity 0.3 passes through → rgba(244,246,251,0.3)", () => {
    const style = rootBackgroundStyle("light", true, 0.3);
    // floor is now 0.1, so opacity 0.3 is no longer clamped
    expect(style.background as string).toBe(glassTint("light", 0.3));
    expect(style.background as string).toContain("rgba(244,246,251,0.3)");
  });

  test("glass:true, dark, opacity 0.7 → produces rgba(15,17,24,0.7)", () => {
    const style = rootBackgroundStyle("dark", true, 0.7);
    expect(style.background as string).toBe("rgba(15,17,24,0.7)");
  });

  test("glass:true, light, opacity 0.8 → produces rgba(244,246,251,0.8)", () => {
    const style = rootBackgroundStyle("light", true, 0.8);
    expect(style.background as string).toBe("rgba(244,246,251,0.8)");
  });

  test("solid differs from glass in background value", () => {
    const solid = rootBackgroundStyle("dark", false, 0.55);
    const glass = rootBackgroundStyle("dark", true, 0.7);
    expect(solid.background).not.toEqual(glass.background);
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

describe("ThemeProvider", () => {
  test("renders children text", () => {
    render(
      <ThemeProvider theme="dark" glass={false} opacity={0.55}>
        <span>child-content</span>
      </ThemeProvider>,
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  test("renders a wrapper div that contains children", () => {
    const { container } = render(
      <ThemeProvider theme="light" glass={false} opacity={0.55}>
        <p>inner</p>
      </ThemeProvider>,
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent("inner");
  });

  test("wrapper div has style with theme CSS vars set (solid dark --bg)", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={false} opacity={0.55}>
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--bg")).toBe(THEMES.dark["--bg"]);
  });

  test("glass dark theme: wrapper has --bg from THEMES.darkGlass", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={true} opacity={0.55}>
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--bg")).toBe(THEMES.darkGlass["--bg"]);
  });

  test("glass light theme: wrapper has --accent from THEMES.lightGlass", () => {
    const { container } = render(
      <ThemeProvider theme="light" glass={true} opacity={0.7}>
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--accent")).toBe(THEMES.lightGlass["--accent"]);
  });

  test("solid light theme: wrapper has --text from THEMES.light", () => {
    const { container } = render(
      <ThemeProvider theme="light" glass={false} opacity={0.55}>
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--text")).toBe(THEMES.light["--text"]);
  });

  test("glass:true: wrapper background contains rgba for dark glass tint", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={true} opacity={0.55}>
        <span>content</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    // glass mode: background is the floor-clamped tint (no separate wallpaper layer)
    // browsers may normalize rgba(15,17,24,...) → rgba(15, 17, 24, ...) with spaces
    expect(wrapper.style.background).toMatch(/rgba\(15,?\s*17,?\s*24,/);
  });

  test("glass:false: wrapper background is var(--bg) (solid mode)", () => {
    const { container } = render(
      <ThemeProvider theme="dark" glass={false} opacity={0.55}>
        <span>content</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toBe("var(--bg)");
  });

  test("children render inside wrapper — glass:true", () => {
    render(
      <ThemeProvider theme="dark" glass={true} opacity={0.7}>
        <button>click-me</button>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "click-me" })).toBeInTheDocument();
  });

  test("children render inside wrapper — glass:false", () => {
    render(
      <ThemeProvider theme="light" glass={false} opacity={0.7}>
        <button>click-me-solid</button>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "click-me-solid" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe("Button", () => {
  test("renders a <button> element", () => {
    render(<Button>Press</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("renders children text inside the button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Save");
  });

  test("calls onClick when clicked (filled variant)", () => {
    const onClick = vi.fn();
    render(
      <Button variant="filled" onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("calls onClick when clicked (outline variant)", () => {
    const onClick = vi.fn();
    render(
      <Button variant="outline" onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("calls onClick when clicked (ghost variant)", () => {
    const onClick = vi.fn();
    render(
      <Button variant="ghost" onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("disabled button has disabled attribute", () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  test("disabled button does NOT call onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        No
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  test("renders children as ReactNode (JSX)", () => {
    render(
      <Button>
        <span data-testid="btn-child">icon</span>
      </Button>,
    );
    expect(screen.getByTestId("btn-child")).toBeInTheDocument();
  });

  test("title prop is set on the button", () => {
    render(<Button title="save-action">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("title", "save-action");
  });

  test("filled variant produces a button (baseline render)", () => {
    const { container } = render(<Button variant="filled">Filled</Button>);
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  test("outline variant produces a button (baseline render)", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  test("ghost variant produces a button (baseline render)", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  test("no variant prop renders a button (default branch)", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Default");
  });
});

// ---------------------------------------------------------------------------
// Segmented
// ---------------------------------------------------------------------------

describe("Segmented", () => {
  const options = [
    { k: "a", label: "Alpha" },
    { k: "b", label: "Beta" },
    { k: "c", label: "Gamma" },
  ];

  test("renders one button per option", () => {
    render(<Segmented options={options} value="a" onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  test("renders each option label", () => {
    render(<Segmented options={options} value="a" onChange={() => {}} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  test("clicking an inactive option calls onChange with its key", () => {
    const onChange = vi.fn();
    render(<Segmented options={options} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  test("clicking another inactive option calls onChange with its key", () => {
    const onChange = vi.fn();
    render(<Segmented options={options} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByText("Gamma"));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  test("active option (k===value) is visually distinct — has aria-pressed or data-active attribute", () => {
    render(<Segmented options={options} value="b" onChange={() => {}} />);
    // The active button should have aria-pressed=true OR a data-active attribute
    const buttons = screen.getAllByRole("button");
    const betaButton = buttons.find((b) => b.textContent === "Beta");
    expect(betaButton).toBeDefined();
    // Expect the active button to be marked distinctly
    const isActive =
      betaButton!.getAttribute("aria-pressed") === "true" ||
      betaButton!.getAttribute("data-active") === "true" ||
      betaButton!.classList.contains("active") ||
      betaButton!.getAttribute("aria-selected") === "true";
    expect(isActive).toBe(true);
  });

  test("inactive option is NOT marked active", () => {
    render(<Segmented options={options} value="b" onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const alphaButton = buttons.find((b) => b.textContent === "Alpha");
    expect(alphaButton).toBeDefined();
    const isActive =
      alphaButton!.getAttribute("aria-pressed") === "true" ||
      alphaButton!.getAttribute("data-active") === "true" ||
      alphaButton!.classList.contains("active") ||
      alphaButton!.getAttribute("aria-selected") === "true";
    expect(isActive).toBe(false);
  });

  test("small prop renders without error and buttons remain present", () => {
    render(<Segmented options={options} value="a" onChange={() => {}} small />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("onChange called with correct key for first option", () => {
    const onChange = vi.fn();
    render(<Segmented options={options} value="c" onChange={onChange} />);
    fireEvent.click(screen.getByText("Alpha"));
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

describe("Stepper", () => {
  test("renders the value", () => {
    render(<Stepper value={5} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("renders label when provided", () => {
    render(<Stepper label="Sets" value={3} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("Sets")).toBeInTheDocument();
  });

  test("renders two buttons (dec and inc)", () => {
    render(<Stepper value={5} onDec={() => {}} onInc={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  test("clicking dec button calls onDec", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<Stepper value={5} onDec={onDec} onInc={onInc} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!); // first button = dec
    expect(onDec).toHaveBeenCalledTimes(1);
    expect(onInc).not.toHaveBeenCalled();
  });

  test("clicking inc button calls onInc", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<Stepper value={5} onDec={onDec} onInc={onInc} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]!); // second button = inc
    expect(onInc).toHaveBeenCalledTimes(1);
    expect(onDec).not.toHaveBeenCalled();
  });

  test("renders label as ReactNode (JSX child)", () => {
    render(<Stepper label={<em>Reps</em>} value={10} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("Reps")).toBeInTheDocument();
  });

  test("renders without label (undefined branch)", () => {
    render(<Stepper value={0} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("with onSet, renders a typeable number input (not a static span)", () => {
    render(
      <Stepper label="Weight" value={60} onDec={() => {}} onInc={() => {}} onSet={() => {}} />,
    );
    const input = screen.getByLabelText("Weight") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("number");
    expect(input.value).toBe("60");
  });

  test("typing a value calls onSet with the parsed number", () => {
    const onSet = vi.fn();
    render(<Stepper value={60} onDec={() => {}} onInc={() => {}} onSet={onSet} />);
    fireEvent.change(screen.getByLabelText("value"), { target: { value: "62.5" } });
    expect(onSet).toHaveBeenCalledWith(62.5);
  });

  test("typing an invalid value does not call onSet", () => {
    const onSet = vi.fn();
    render(<Stepper value={60} onDec={() => {}} onInc={() => {}} onSet={onSet} />);
    fireEvent.change(screen.getByLabelText("value"), { target: { value: "" } });
    expect(onSet).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe("Toggle", () => {
  test("renders a clickable element (role=switch or button)", () => {
    render(<Toggle on={false} onChange={() => {}} />);
    // Toggle is a track+knob; look for button or switch role
    const toggle = screen.queryByRole("switch") ?? screen.queryByRole("button");
    expect(toggle).toBeInTheDocument();
  });

  test("clicking toggle when off calls onChange(true)", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} />);
    const toggle = screen.queryByRole("switch") ?? screen.getByRole("button");
    fireEvent.click(toggle!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("clicking toggle when on calls onChange(false)", () => {
    const onChange = vi.fn();
    render(<Toggle on={true} onChange={onChange} />);
    const toggle = screen.queryByRole("switch") ?? screen.getByRole("button");
    fireEvent.click(toggle!);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test("on=true sets aria-checked=true (or data-on=true)", () => {
    render(<Toggle on={true} onChange={() => {}} />);
    const el = screen.queryByRole("switch");
    if (el) {
      expect(el).toHaveAttribute("aria-checked", "true");
    } else {
      // Fallback: check for a data attribute or class distinguishing on state
      const { container } = render(<Toggle on={true} onChange={() => {}} />);
      const track = container.firstChild as HTMLElement;
      const isOn =
        track.getAttribute("data-on") === "true" ||
        track.getAttribute("aria-checked") === "true" ||
        track.classList.contains("on");
      expect(isOn).toBe(true);
    }
  });

  test("on=false sets aria-checked=false (or data-on=false / no on class)", () => {
    render(<Toggle on={false} onChange={() => {}} />);
    const el = screen.queryByRole("switch");
    if (el) {
      expect(el).toHaveAttribute("aria-checked", "false");
    } else {
      const { container } = render(<Toggle on={false} onChange={() => {}} />);
      const track = container.firstChild as HTMLElement;
      const isOn =
        track.getAttribute("data-on") === "true" ||
        track.getAttribute("aria-checked") === "true" ||
        track.classList.contains("on");
      expect(isOn).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe("Card", () => {
  test("renders children text", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  test("renders in a div element", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  test("merges style prop", () => {
    const { container } = render(<Card style={{ opacity: 0.3 }}>styled</Card>);
    const div = container.querySelector("div") as HTMLElement;
    expect(div.style.opacity).toBe("0.3");
  });

  test("renders multiple children", () => {
    render(
      <Card>
        <span>A</span>
        <span>B</span>
      </Card>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// LiveDot
// ---------------------------------------------------------------------------

describe("LiveDot", () => {
  test("renders a dot element (div or span)", () => {
    const { container } = render(<LiveDot active={false} />);
    expect(container.firstChild).not.toBeNull();
  });

  test("active=true element has active indicator (aria-label, data-active, or class)", () => {
    const { container } = render(<LiveDot active={true} />);
    const dot = container.firstChild as HTMLElement;
    const isActive =
      dot.getAttribute("data-active") === "true" ||
      dot.classList.contains("active") ||
      dot.getAttribute("aria-label")?.includes("active") ||
      dot.getAttribute("aria-live") !== null;
    expect(isActive).toBe(true);
  });

  test("active=false produces different output from active=true", () => {
    const { container: containerActive } = render(<LiveDot active={true} />);
    const { container: containerInactive } = render(<LiveDot active={false} />);
    // The two containers must differ (active changes something)
    expect(containerActive.innerHTML).not.toBe(containerInactive.innerHTML);
  });
});

// ---------------------------------------------------------------------------
// Icon — loop over EVERY IconName
// ---------------------------------------------------------------------------

describe("Icon", () => {
  test.each(ALL_ICON_NAMES)("renders an <svg> with a <path> for name=%s", (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const path = svg!.querySelector("path");
    expect(path).not.toBeNull();
  });

  test("size prop is applied to svg width/height", () => {
    const { container } = render(<Icon name="bolt" size={32} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    // Either attribute or style carries the size
    const hasSize =
      svg.getAttribute("width") === "32" ||
      svg.getAttribute("height") === "32" ||
      svg.style.width === "32px" ||
      svg.style.height === "32px";
    expect(hasSize).toBe(true);
  });

  test("stroke prop is applied to svg or path", () => {
    const { container } = render(<Icon name="check" stroke="red" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const path = svg.querySelector("path") as SVGPathElement;
    const hasStroke = svg.getAttribute("stroke") === "red" || path.getAttribute("stroke") === "red";
    expect(hasStroke).toBe(true);
  });

  test("heart icon (logo) renders an svg with a path", () => {
    const { container } = render(<Icon name="heart" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  test("default size renders without error (no size prop)", () => {
    const { container } = render(<Icon name="home" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("default stroke renders without error (no stroke prop)", () => {
    const { container } = render(<Icon name="settings" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  // Ensure all 13 icon names are distinct paths (not all the same)
  test("today and plan icons produce different svg path d attributes", () => {
    const { container: c1 } = render(<Icon name="today" />);
    const { container: c2 } = render(<Icon name="plan" />);
    const d1 = c1.querySelector("svg path")?.getAttribute("d");
    const d2 = c2.querySelector("svg path")?.getAttribute("d");
    expect(d1).not.toBe(d2);
  });
});

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

describe("Dropdown", () => {
  const options = [
    { k: "weight_reps", label: "Weight & reps" },
    { k: "bodyweight_reps", label: "Bodyweight reps" },
    { k: "time", label: "Time" },
  ];

  test("renders a button showing the selected option's label", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("Weight & reps");
  });

  test("menu is NOT visible before clicking the trigger", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    // No listbox before clicking
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("clicking the trigger opens the menu (listbox with all options)", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    // All three option labels are present in the listbox
    const optionEls = screen.getAllByRole("option");
    expect(optionEls).toHaveLength(3);
    expect(optionEls[0]!.textContent).toContain("Weight & reps");
    expect(optionEls[1]!.textContent).toContain("Bodyweight reps");
    expect(optionEls[2]!.textContent).toContain("Time");
  });

  test("clicking an option calls onChange with that option's key", () => {
    const onChange = vi.fn();
    render(<Dropdown value="weight_reps" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button")); // open
    fireEvent.click(screen.getByText("Bodyweight reps"));
    expect(onChange).toHaveBeenCalledWith("bodyweight_reps");
  });

  test("clicking an option closes the menu (listbox disappears)", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button")); // open
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Time"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("the active option (value===k) is highlighted (data-active or aria-selected)", () => {
    render(<Dropdown value="bodyweight_reps" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button")); // open
    const activeOpt =
      document.querySelector("[data-active='true']") ??
      document.querySelector("[aria-selected='true']");
    expect(activeOpt).not.toBeNull();
    expect(activeOpt!.textContent).toContain("Bodyweight reps");
  });

  test("pressing Escape closes the open menu", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button")); // open
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("clicking the backdrop (outside the menu) closes the menu", () => {
    const { container } = render(
      <Dropdown value="weight_reps" options={options} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button")); // open
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const backdrop = container.querySelector("[data-dropdown-backdrop]") as Element;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("ariaLabel prop is applied to the trigger button", () => {
    render(
      <Dropdown
        value="weight_reps"
        options={options}
        onChange={() => {}}
        ariaLabel="HOW TO TRACK IT"
      />,
    );
    const trigger = screen.getByRole("button", { name: /HOW TO TRACK IT/i });
    expect(trigger).toBeInTheDocument();
  });

  test("clicking the trigger again while open closes the menu (toggle)", () => {
    render(<Dropdown value="weight_reps" options={options} onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger); // open
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(trigger); // close
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  test("onChange is NOT called if menu is closed via Escape (no selection)", () => {
    const onChange = vi.fn();
    render(<Dropdown value="weight_reps" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button")); // open
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
  });

  test("fallback label: renders value string when no matching option found", () => {
    render(<Dropdown value="unknown_key" options={options} onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("unknown_key");
  });
});

// ---------------------------------------------------------------------------
// AdviceCard
// ---------------------------------------------------------------------------

describe("AdviceCard", () => {
  const advice: AdviceText = {
    primary: "9 × 60 kg",
    alternative: "8 × 62.5 kg",
    reason: "Inside your range — beat last time.",
    basis: "Last time: 8 × 60 kg",
  };

  test("shows both targets, what it was based on and the reasoning", () => {
    const { container } = render(<AdviceCard advice={advice} />);
    expect(screen.getByText("9 × 60 kg")).toBeInTheDocument();
    expect(screen.getByText("8 × 62.5 kg")).toBeInTheDocument();
    expect(container).toHaveTextContent("Try 9 × 60 kg or 8 × 62.5 kg");
    expect(container).toHaveTextContent("Last time: 8 × 60 kg");
    expect(container).toHaveTextContent("Inside your range — beat last time.");
  });

  test("without onApply the targets are plain text, not buttons", () => {
    render(<AdviceCard advice={advice} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  test("with onApply each target is a button that applies that option", () => {
    const onApply = vi.fn();
    render(<AdviceCard advice={advice} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "9 × 60 kg" }));
    expect(onApply).toHaveBeenLastCalledWith("primary");

    fireEvent.click(screen.getByRole("button", { name: "8 × 62.5 kg" }));
    expect(onApply).toHaveBeenLastCalledWith("alternative");
    expect(onApply).toHaveBeenCalledTimes(2);
  });

  test('with no alternative there is a single target and no "or"', () => {
    const onApply = vi.fn();
    const { container } = render(
      <AdviceCard advice={{ ...advice, alternative: null }} onApply={onApply} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.textContent).not.toMatch(/\bor\b/);
    expect(container).toHaveTextContent("Try 9 × 60 kg");
  });

  test("with no history only the reason is shown (no dangling separator)", () => {
    const first: AdviceText = {
      primary: "8 × 0 kg",
      alternative: null,
      reason: "First time — start light and find your level.",
      basis: null,
    };
    const { container } = render(<AdviceCard advice={first} />);
    expect(container).toHaveTextContent("First time — start light and find your level.");
    expect(container.textContent).not.toContain("Last time");
    expect(container.textContent).not.toContain(" · ");
  });
});
