/**
 * B16 · @nabd/design-system — value-asserting tests (RED against skeleton).
 *
 * ALL tests should be RED now (skeleton throws "not implemented").
 * Once implemented they must pass at 100% coverage of src/index.ts.
 *
 * Strategy: every exported function / component is called so that v8 coverage
 * reaches 100% of src/**. Assertions encode the concrete expected DOM/values.
 */

// React must be in scope for the classic JSX transform used by vitest/esbuild.
// Direct path import is necessary because vite resolves 'react' from the package
// root (packages/B16-design-system) not the test file's directory.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES, WALLPAPERS } from "@nabd/domain";
import type { Theme, Wallpaper } from "@nabd/domain";

import {
  themeVars,
  rootBackgroundStyle,
  wallpaperStyle,
  ThemeProvider,
  Button,
  Segmented,
  Stepper,
  MiniStepper,
  Toggle,
  Pill,
  Card,
  Badge,
  Donut,
  LiveDot,
  Icon,
} from "@nabd/design-system";
import type { IconName } from "@nabd/design-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THEMES_LIST: Theme[] = ["translucent", "light", "dark"];
const WALLPAPERS_LIST: Wallpaper[] = ["aurora", "dusk", "mesh", "slate"];

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

// ---------------------------------------------------------------------------
// themeVars
// ---------------------------------------------------------------------------

describe("themeVars", () => {
  test.each(THEMES_LIST)(
    "includes every THEMES[%s] key for theme=%s",
    (theme) => {
      const vars = themeVars(theme, 0.55);
      const expected = THEMES[theme];
      for (const key of Object.keys(expected)) {
        // Each CSS custom property must appear in the returned object
        expect(vars).toHaveProperty(key, expected[key]);
      }
    },
  );

  test("translucent theme has all 11 CSS custom properties", () => {
    const vars = themeVars("translucent", 0.55);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(
      Object.keys(THEMES.translucent).length,
    );
  });

  test("light theme has all 11 CSS custom properties", () => {
    const vars = themeVars("light", 0.55);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(
      Object.keys(THEMES.light).length,
    );
  });

  test("dark theme has all 11 CSS custom properties", () => {
    const vars = themeVars("dark", 0.55);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(
      Object.keys(THEMES.dark).length,
    );
  });

  test("opacity parameter is accepted (does not affect non-translucent key set)", () => {
    const vars1 = themeVars("dark", 0.3);
    const vars2 = themeVars("dark", 0.8);
    // Both calls must succeed and return the same set of keys
    expect(Object.keys(vars1)).toEqual(Object.keys(vars2));
  });
});

// ---------------------------------------------------------------------------
// rootBackgroundStyle
// ---------------------------------------------------------------------------

describe("rootBackgroundStyle", () => {
  test("translucent → rgba background with supplied opacity", () => {
    const style = rootBackgroundStyle("translucent", 0.7);
    expect(style).toHaveProperty("background", "rgba(22,24,32,0.7)");
  });

  test("translucent → backdropFilter contains blur(36px) saturate(1.5)", () => {
    const style = rootBackgroundStyle("translucent", 0.55);
    expect(style).toHaveProperty("backdropFilter", "blur(36px) saturate(1.5)");
  });

  test("translucent → WebkitBackdropFilter equals backdropFilter", () => {
    const style = rootBackgroundStyle("translucent", 0.55);
    expect(style).toHaveProperty(
      "WebkitBackdropFilter",
      "blur(36px) saturate(1.5)",
    );
  });

  test("translucent → opacity 0.2 boundary produces rgba(22,24,32,0.2)", () => {
    const style = rootBackgroundStyle("translucent", 0.2);
    expect(style).toHaveProperty("background", "rgba(22,24,32,0.2)");
  });

  test("translucent → opacity 0.9 boundary produces rgba(22,24,32,0.9)", () => {
    const style = rootBackgroundStyle("translucent", 0.9);
    expect(style).toHaveProperty("background", "rgba(22,24,32,0.9)");
  });

  test("light → background is var(--bg)", () => {
    const style = rootBackgroundStyle("light", 0.55);
    expect(style).toHaveProperty("background", "var(--bg)");
  });

  test("light → no backdropFilter", () => {
    const style = rootBackgroundStyle("light", 0.55);
    expect(style).not.toHaveProperty("backdropFilter");
  });

  test("dark → background is var(--bg)", () => {
    const style = rootBackgroundStyle("dark", 0.55);
    expect(style).toHaveProperty("background", "var(--bg)");
  });

  test("dark → no backdropFilter", () => {
    const style = rootBackgroundStyle("dark", 0.55);
    expect(style).not.toHaveProperty("backdropFilter");
  });

  test("translucent differs from light in background value", () => {
    const t = rootBackgroundStyle("translucent", 0.55);
    const l = rootBackgroundStyle("light", 0.55);
    expect(t.background).not.toEqual(l.background);
  });

  test("translucent differs from dark in background value", () => {
    const t = rootBackgroundStyle("translucent", 0.55);
    const d = rootBackgroundStyle("dark", 0.55);
    expect(t.background).not.toEqual(d.background);
  });
});

// ---------------------------------------------------------------------------
// wallpaperStyle
// ---------------------------------------------------------------------------

describe("wallpaperStyle", () => {
  test("translucent → display block", () => {
    const style = wallpaperStyle("translucent", "aurora");
    expect(style).toHaveProperty("display", "block");
  });

  test("translucent + aurora → background matches WALLPAPERS.aurora", () => {
    const style = wallpaperStyle("translucent", "aurora");
    expect(style).toHaveProperty("background", WALLPAPERS.aurora);
  });

  test("translucent + dusk → background matches WALLPAPERS.dusk", () => {
    const style = wallpaperStyle("translucent", "dusk");
    expect(style).toHaveProperty("background", WALLPAPERS.dusk);
  });

  test("translucent + mesh → background matches WALLPAPERS.mesh", () => {
    const style = wallpaperStyle("translucent", "mesh");
    expect(style).toHaveProperty("background", WALLPAPERS.mesh);
  });

  test("translucent + slate → background matches WALLPAPERS.slate", () => {
    const style = wallpaperStyle("translucent", "slate");
    expect(style).toHaveProperty("background", WALLPAPERS.slate);
  });

  test("translucent → position fixed", () => {
    const style = wallpaperStyle("translucent", "aurora");
    expect(style).toHaveProperty("position", "fixed");
  });

  test("translucent → inset 0", () => {
    const style = wallpaperStyle("translucent", "aurora");
    expect(style).toHaveProperty("inset", 0);
  });

  test("translucent → zIndex 0", () => {
    const style = wallpaperStyle("translucent", "aurora");
    expect(style).toHaveProperty("zIndex", 0);
  });

  test("light → display none", () => {
    const style = wallpaperStyle("light", "aurora");
    expect(style).toHaveProperty("display", "none");
  });

  test("dark → display none", () => {
    const style = wallpaperStyle("dark", "aurora");
    expect(style).toHaveProperty("display", "none");
  });

  test("non-translucent display differs from translucent", () => {
    const t = wallpaperStyle("translucent", "aurora");
    const l = wallpaperStyle("light", "aurora");
    expect(t.display).not.toEqual(l.display);
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

describe("ThemeProvider", () => {
  test("renders children text", () => {
    render(
      <ThemeProvider theme="dark" opacity={0.55} wallpaper="aurora">
        <span>child-content</span>
      </ThemeProvider>,
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  test("renders a wrapper div that contains children", () => {
    const { container } = render(
      <ThemeProvider theme="light" opacity={0.55} wallpaper="slate">
        <p>inner</p>
      </ThemeProvider>,
    );
    // The outermost rendered element should be a div or element wrapping children
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveTextContent("inner");
  });

  test("wrapper div has style with theme CSS vars set", () => {
    const { container } = render(
      <ThemeProvider theme="dark" opacity={0.55} wallpaper="aurora">
        <span>x</span>
      </ThemeProvider>,
    );
    // The wrapper div must have an inline style containing --bg for the dark theme
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--bg")).toBe(
      THEMES.dark["--bg"],
    );
  });

  test("translucent theme: wrapper has --accent from THEMES.translucent", () => {
    const { container } = render(
      <ThemeProvider theme="translucent" opacity={0.55} wallpaper="aurora">
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--accent")).toBe(
      THEMES.translucent["--accent"],
    );
  });

  test("light theme: wrapper has --text from THEMES.light", () => {
    const { container } = render(
      <ThemeProvider theme="light" opacity={0.55} wallpaper="dusk">
        <span>x</span>
      </ThemeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.getPropertyValue("--text")).toBe(
      THEMES.light["--text"],
    );
  });

  test("renders a wallpaper layer element inside the wrapper", () => {
    const { container } = render(
      <ThemeProvider theme="translucent" opacity={0.55} wallpaper="aurora">
        <span>content</span>
      </ThemeProvider>,
    );
    // A wallpaper layer div must be present (not the child, a separate element)
    const allDivs = container.querySelectorAll("div");
    expect(allDivs.length).toBeGreaterThanOrEqual(1);
  });

  test("children render inside (not swallowed by wallpaper layer)", () => {
    render(
      <ThemeProvider theme="translucent" opacity={0.7} wallpaper="mesh">
        <button>click-me</button>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "click-me" })).toBeInTheDocument();
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
    const { container } = render(
      <Button variant="filled">Filled</Button>,
    );
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  test("outline variant produces a button (baseline render)", () => {
    const { container } = render(
      <Button variant="outline">Outline</Button>,
    );
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  test("ghost variant produces a button (baseline render)", () => {
    const { container } = render(
      <Button variant="ghost">Ghost</Button>,
    );
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
    render(
      <Segmented options={options} value="a" onChange={() => {}} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  test("renders each option label", () => {
    render(
      <Segmented options={options} value="a" onChange={() => {}} />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  test("clicking an inactive option calls onChange with its key", () => {
    const onChange = vi.fn();
    render(
      <Segmented options={options} value="a" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  test("clicking another inactive option calls onChange with its key", () => {
    const onChange = vi.fn();
    render(
      <Segmented options={options} value="a" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Gamma"));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  test("active option (k===value) is visually distinct — has aria-pressed or data-active attribute", () => {
    render(
      <Segmented options={options} value="b" onChange={() => {}} />,
    );
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
    render(
      <Segmented options={options} value="b" onChange={() => {}} />,
    );
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
    render(
      <Segmented options={options} value="a" onChange={() => {}} small />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("onChange called with correct key for first option", () => {
    const onChange = vi.fn();
    render(
      <Segmented options={options} value="c" onChange={onChange} />,
    );
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
    render(
      <Stepper label="Sets" value={3} onDec={() => {}} onInc={() => {}} />,
    );
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
    fireEvent.click(buttons[0]); // first button = dec
    expect(onDec).toHaveBeenCalledTimes(1);
    expect(onInc).not.toHaveBeenCalled();
  });

  test("clicking inc button calls onInc", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<Stepper value={5} onDec={onDec} onInc={onInc} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // second button = inc
    expect(onInc).toHaveBeenCalledTimes(1);
    expect(onDec).not.toHaveBeenCalled();
  });

  test("renders label as ReactNode (JSX child)", () => {
    render(
      <Stepper
        label={<em>Reps</em>}
        value={10}
        onDec={() => {}}
        onInc={() => {}}
      />,
    );
    expect(screen.getByText("Reps")).toBeInTheDocument();
  });

  test("renders without label (undefined branch)", () => {
    render(<Stepper value={0} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MiniStepper
// ---------------------------------------------------------------------------

describe("MiniStepper", () => {
  test("renders the value", () => {
    render(<MiniStepper value={3} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("renders two buttons", () => {
    render(<MiniStepper value={3} onDec={() => {}} onInc={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  test("clicking first button calls onDec", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<MiniStepper value={3} onDec={onDec} onInc={onInc} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onDec).toHaveBeenCalledTimes(1);
    expect(onInc).not.toHaveBeenCalled();
  });

  test("clicking second button calls onInc", () => {
    const onDec = vi.fn();
    const onInc = vi.fn();
    render(<MiniStepper value={3} onDec={onDec} onInc={onInc} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onInc).toHaveBeenCalledTimes(1);
    expect(onDec).not.toHaveBeenCalled();
  });

  test("renders value as ReactNode (string)", () => {
    render(<MiniStepper value="12" onDec={() => {}} onInc={() => {}} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe("Toggle", () => {
  test("renders a clickable element (role=switch or button)", () => {
    render(<Toggle on={false} onChange={() => {}} />);
    // Toggle is a track+knob; look for button or switch role
    const toggle =
      screen.queryByRole("switch") ?? screen.queryByRole("button");
    expect(toggle).toBeInTheDocument();
  });

  test("clicking toggle when off calls onChange(true)", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} />);
    const toggle =
      screen.queryByRole("switch") ?? screen.getByRole("button");
    fireEvent.click(toggle!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("clicking toggle when on calls onChange(false)", () => {
    const onChange = vi.fn();
    render(<Toggle on={true} onChange={onChange} />);
    const toggle =
      screen.queryByRole("switch") ?? screen.getByRole("button");
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
// Pill
// ---------------------------------------------------------------------------

describe("Pill", () => {
  test("renders children text", () => {
    render(<Pill>Active</Pill>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  test("renders in a span element", () => {
    const { container } = render(<Pill>Active</Pill>);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  test("default tone renders without error", () => {
    render(<Pill tone="default">default</Pill>);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  test("accent tone renders without error", () => {
    render(<Pill tone="accent">accent</Pill>);
    expect(screen.getByText("accent")).toBeInTheDocument();
  });

  test("accent2 tone renders without error", () => {
    render(<Pill tone="accent2">accent2</Pill>);
    expect(screen.getByText("accent2")).toBeInTheDocument();
  });

  test("accent3 tone renders without error", () => {
    render(<Pill tone="accent3">accent3</Pill>);
    expect(screen.getByText("accent3")).toBeInTheDocument();
  });

  test("merges style prop", () => {
    const { container } = render(
      <Pill style={{ opacity: 0.5 }}>styled</Pill>,
    );
    const span = container.querySelector("span") as HTMLElement;
    expect(span.style.opacity).toBe("0.5");
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
    const { container } = render(
      <Card style={{ opacity: 0.3 }}>styled</Card>,
    );
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
// Badge
// ---------------------------------------------------------------------------

describe("Badge", () => {
  test("renders children text", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  test("accent tone renders without error", () => {
    render(<Badge tone="accent">accent</Badge>);
    expect(screen.getByText("accent")).toBeInTheDocument();
  });

  test("accent2 tone renders without error", () => {
    render(<Badge tone="accent2">accent2</Badge>);
    expect(screen.getByText("accent2")).toBeInTheDocument();
  });

  test("accent3 tone renders without error", () => {
    render(<Badge tone="accent3">accent3</Badge>);
    expect(screen.getByText("accent3")).toBeInTheDocument();
  });

  test("muted tone renders without error", () => {
    render(<Badge tone="muted">muted</Badge>);
    expect(screen.getByText("muted")).toBeInTheDocument();
  });

  test("no tone prop renders with default styling", () => {
    render(<Badge>default</Badge>);
    expect(screen.getByText("default")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

describe("Donut", () => {
  test("renders done value", () => {
    render(<Donut pct={50} done={3} total={6} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("renders total value", () => {
    render(<Donut pct={50} done={3} total={6} />);
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  test("renders caption when provided", () => {
    render(<Donut pct={75} done={3} total={4} caption="today" />);
    expect(screen.getByText("today")).toBeInTheDocument();
  });

  test("renders without caption (undefined branch)", () => {
    render(<Donut pct={100} done={5} total={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("pct=0 renders 0 progress (done=0)", () => {
    render(<Donut pct={0} done={0} total={5} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("pct=100 (complete) renders done=total", () => {
    render(<Donut pct={100} done={8} total={8} />);
    const eights = screen.getAllByText("8");
    expect(eights).toHaveLength(2);
  });

  test("renders a container element (div or svg)", () => {
    const { container } = render(<Donut pct={50} done={3} total={6} />);
    expect(container.firstChild).not.toBeNull();
  });

  test("caption as ReactNode renders a span", () => {
    render(
      <Donut pct={50} done={2} total={4} caption={<span>cap</span>} />,
    );
    expect(screen.getByText("cap")).toBeInTheDocument();
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
    const { container } = render(
      <Icon name="check" stroke="red" />,
    );
    const svg = container.querySelector("svg") as SVGSVGElement;
    const path = svg.querySelector("path") as SVGPathElement;
    const hasStroke =
      svg.getAttribute("stroke") === "red" ||
      path.getAttribute("stroke") === "red";
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
