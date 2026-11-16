import { render, screen } from "@testing-library/react";
import { Button, IconButton } from "@nabd/design-system";
import { click, renderRoot } from "./render";

describe("Button", () => {
  it("renders its label and calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start set</Button>);
    click("Start set");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Create
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    click("Create");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("takes a tooltip and an accessible name of its own", () => {
    render(
      <Button title="Use this" ariaLabel="Apply suggestion">
        9 × 25
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Apply suggestion" })).toHaveAttribute(
      "title",
      "Use this",
    );
  });

  it("never submits a surrounding form", () => {
    expect(renderRoot(<Button>Go</Button>)).toHaveAttribute("type", "button");
  });

  it.each(["primary", "secondary", "ghost", "link", "add", "badge"] as const)(
    "renders the %s variant as a button",
    (variant) => {
      render(<Button variant={variant}>Label</Button>);
      expect(screen.getByRole("button", { name: "Label" })).toBeInTheDocument();
    },
  );

  it("as a badge, keeps its tooltip and calls onClick", () => {
    const onClick = vi.fn();
    render(
      <Button variant="badge" tone="accent" title="Working set — click to change" onClick={onClick}>
        1
      </Button>,
    );
    const badge = screen.getByRole("button", { name: "1" });
    expect(badge).toHaveAttribute("title", "Working set — click to change");
    click("1");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("IconButton", () => {
  it("is named by its label, shows it as a tooltip, and calls onClick", () => {
    const onClick = vi.fn();
    render(<IconButton icon="copy" ariaLabel="Duplicate" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Duplicate" });
    expect(button).toHaveAttribute("title", "Duplicate");
    expect(button.querySelector("[data-icon='copy']")).not.toBeNull();
    click("Duplicate");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const onClick = vi.fn();
    render(<IconButton icon="chevron-up" ariaLabel="Move earlier" onClick={onClick} disabled />);
    click("Move earlier");
    expect(onClick).not.toHaveBeenCalled();
  });
});
