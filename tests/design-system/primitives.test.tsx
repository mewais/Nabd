import { render, screen, within } from "@testing-library/react";
import {
  Button,
  CardButton,
  CheckMark,
  ChipGroup,
  COLOR,
  Divider,
  Grid,
  HeatCell,
  IconButton,
  ProgressRing,
  Row,
  RowButton,
  Spacer,
  SplitBar,
  Stack,
  Swatch,
  Text,
  TitleBlock,
  Toggle,
  Wordmark,
} from "@nabd/design-system";
import { renderRoot } from "./render";

describe("Row and Stack", () => {
  it("render the element and the name they are given, so structure stays semantic", () => {
    render(
      <Stack as="ul" ariaLabel="Sets">
        <Row as="li">one</Row>
      </Stack>,
    );
    const list = screen.getByRole("list", { name: "Sets" });
    expect(within(list).getByRole("listitem")).toHaveTextContent("one");
  });

  it("take a role, such as a status region", () => {
    render(<Row role="status">Saved</Row>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});

describe("Grid", () => {
  it("holds its cells under the role and the name it is given", () => {
    render(
      <Grid role="group" ariaLabel="Days" columns={3}>
        <span>Mon</span>
        <span>Tue</span>
      </Grid>,
    );
    expect(screen.getByRole("group", { name: "Days" })).toHaveTextContent("MonTue");
  });
});

describe("Spacer", () => {
  it("is invisible to assistive tech", () => {
    expect(renderRoot(<Spacer />)).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Divider", () => {
  it("is a separator, across a stack by default", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("can stand upright between the things in a row", () => {
    render(<Divider vertical />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});

describe("Text", () => {
  it("renders the element it is given, so a heading is a heading", () => {
    render(
      <Text as="h2" variant="title">
        Settings
      </Text>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Settings" })).toBeInTheDocument();
  });

  it("keeps an eyebrow's copy in plain case (the upper-casing is only how it is drawn)", () => {
    expect(renderRoot(<Text variant="eyebrow">Logged today</Text>)).toHaveTextContent(
      "Logged today",
    );
  });

  it("colours itself by tone, through the theme's colours", () => {
    expect(renderRoot(<Text tone="accent">a</Text>).style.color).toBe(COLOR.accent);
    expect(renderRoot(<Text tone="faint">a</Text>).style.color).toBe(COLOR.textFaint);
  });
});

describe("TitleBlock", () => {
  it("shows a title with its subtitle under it", () => {
    const block = renderRoot(<TitleBlock title="Push" subtitle="Mon · 4 exercises" />);
    expect(block).toHaveTextContent(/^PushMon · 4 exercises$/);
  });

  it("is only phrasing content when it sits inside a button", () => {
    render(
      <button>
        <TitleBlock title="Pull-Up" subtitle="3 × 8" tag={<b>A1</b>} inline />
      </button>,
    );
    const button = screen.getByRole("button", { name: /Pull-Up/ });
    expect(button.querySelector("div")).toBeNull();
  });
});

describe("CheckMark", () => {
  it("says what it marks when given a label", () => {
    render(<CheckMark state="done" ariaLabel="Done" />);
    expect(screen.getByRole("img", { name: "Done" })).toBeInTheDocument();
  });

  it("is decorative without one", () => {
    render(<CheckMark state="todo" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("gives each state a shape of its own, so colour is never the only signal", () => {
    const done = renderRoot(<CheckMark state="done" />);
    const next = renderRoot(<CheckMark state="next" />);
    const todo = renderRoot(<CheckMark state="todo" />);
    expect(done.querySelector("svg[data-icon='check']")).not.toBeNull();
    expect(next.querySelector("svg")).toBeNull();
    expect(next.children).toHaveLength(1);
    expect(todo.children).toHaveLength(0);
  });
});

describe("Swatch", () => {
  it("is a labelled image when it carries meaning, and decorative otherwise", () => {
    render(<Swatch tone="success" ariaLabel="Done" />);
    expect(screen.getByRole("img", { name: "Done" })).toBeInTheDocument();
    expect(renderRoot(<Swatch />)).not.toHaveAttribute("role");
  });
});

describe("HeatCell", () => {
  it("shows its label at a level of the heat scale", () => {
    expect(renderRoot(<HeatCell level="mid">12</HeatCell>)).toHaveTextContent("12");
  });

  it("keeps its place but shows nothing when blank", () => {
    const blank = renderRoot(<HeatCell level={null}>19</HeatCell>);
    expect(blank).toBeEmptyDOMElement();
  });
});

describe("ProgressRing", () => {
  it("is one image named by the whole reading, with the count in the middle", () => {
    render(<ProgressRing pct={40} value={2} caption="of 5 sets" ariaLabel="2 of 5 sets done" />);
    const ring = screen.getByRole("img", { name: "2 of 5 sets done" });
    expect(ring).toHaveTextContent("2of 5 sets");
  });
});

describe("SplitBar", () => {
  it("is decorative: the figures beside it say what it shows", () => {
    const bar = renderRoot(
      <SplitBar
        segments={[
          { key: "a", pct: 60, tone: "accent" },
          { key: "b", pct: 40, tone: "info" },
        ]}
      />,
    );
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar.children).toHaveLength(2);
  });
});

describe("Wordmark", () => {
  it("marks the Arabic name as Arabic", () => {
    render(<Wordmark />);
    expect(screen.getByText("نبض")).toHaveAttribute("lang", "ar");
  });
});

describe("ButtonBase, under every button", () => {
  const noop = (): void => undefined;
  const buttons = (): HTMLButtonElement[] => {
    render(
      <>
        <Button onClick={noop}>Save</Button>
        <IconButton icon="close" ariaLabel="Close" onClick={noop} />
        <RowButton onClick={noop}>Row</RowButton>
        <RowButton variant="nav" selected={false} onClick={noop}>
          Today
        </RowButton>
        <ChipGroup options={[{ value: "chest", label: "Chest" }]} selected={[]} onToggle={noop} />
        <CardButton selected={false} onClick={noop}>
          Card
        </CardButton>
        <Button variant="badge" onClick={noop} title="Edit">
          A1
        </Button>
        <Toggle on={false} onChange={noop} ariaLabel="Sound" />
      </>,
    );
    return screen
      .getAllByRole("button")
      .concat(screen.getAllByRole("switch")) as HTMLButtonElement[];
  };

  it("is a real button that never submits a form", () => {
    const all = buttons();
    expect(all).toHaveLength(8);
    for (const button of all) {
      expect(button.tagName).toBe("BUTTON");
      expect(button).toHaveAttribute("type", "button");
    }
  });

  it("wears the one class the focus ring hangs on", () => {
    const classes = new Set(buttons().map((button) => button.className));
    expect(classes.size).toBe(1);
  });

  it("dims and refuses clicks while disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Log
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Log" });
    button.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
