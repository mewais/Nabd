import { fireEvent, render, screen } from "@testing-library/react";
import { Badge, CardButton, Chip, Segmented, TitleInput } from "@nabd/design-system";
import { click } from "./render";

describe("Badge", () => {
  it("is a plain marker by default", () => {
    render(<Badge>W</Badge>);
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("becomes a button with a tooltip when it can be clicked", () => {
    const onClick = vi.fn();
    render(
      <Badge tone="accent" title="Working — click to change" onClick={onClick}>
        2
      </Badge>,
    );
    click("2");
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "title",
      "Working — click to change",
    );
  });
});

describe("CardButton", () => {
  it("reports a click and says whether it is the selected one", () => {
    const onClick = vi.fn();
    const { rerender } = render(<CardButton onClick={onClick}>Push</CardButton>);
    expect(screen.getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "false");
    click("Push");
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <CardButton onClick={onClick} selected>
        Push
      </CardButton>,
    );
    expect(screen.getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "true");
  });

  it("is a plain action, not a selection, when dashed", () => {
    render(
      <CardButton dashed onClick={vi.fn()}>
        Add day
      </CardButton>,
    );
    expect(screen.getByRole("button", { name: "Add day" })).not.toHaveAttribute("aria-pressed");
  });
});

describe("TitleInput", () => {
  it("shows the title in a named field and reports what is typed", () => {
    const onChange = vi.fn();
    render(<TitleInput ariaLabel="Program name" value="My Plan" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Program name" });
    expect(input).toHaveValue("My Plan");
    fireEvent.change(input, { target: { value: "Winter Bulk" } });
    expect(onChange).toHaveBeenCalledWith("Winter Bulk");
  });
});

describe("Chip with a remove button", () => {
  it("ends in a × that calls onRemove", () => {
    const onRemove = vi.fn();
    render(
      <Chip variant="box" onRemove={onRemove} removeLabel="Remove Plank from pool">
        Plank
      </Chip>,
    );
    expect(screen.getByText("Plank")).toBeInTheDocument();
    click("Remove Plank from pool");
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("has no button without onRemove", () => {
    render(<Chip variant="box">Plank</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Segmented options with a name, a tooltip or disabled", () => {
  const OPTIONS = [
    { k: "1", label: "M", ariaLabel: "Monday", title: "Monday" },
    { k: "2", label: "T", disabled: true, title: "Taken" },
  ];

  it("names an option by its ariaLabel and shows its tooltip", () => {
    render(<Segmented options={OPTIONS} value="1" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("title", "Monday");
  });

  it("does not let a disabled option be picked", () => {
    const onChange = vi.fn();
    render(<Segmented options={OPTIONS} value="1" onChange={onChange} />);
    const tuesday = screen.getByRole("button", { name: "T" });
    expect(tuesday).toBeDisabled();
    fireEvent.click(tuesday);
    expect(onChange).not.toHaveBeenCalled();
  });
});
