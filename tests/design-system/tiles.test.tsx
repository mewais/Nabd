import { fireEvent, render, screen } from "@testing-library/react";
import { Badge, CardButton, Chip, Segmented, StatTile, TitleInput } from "@nabd/design-system";
import { click } from "./render";

describe("StatTile", () => {
  it("shows a figure under its label, with its unit when it has one", () => {
    render(<StatTile label="Sets this week" value="1,250" unit="sets" />);
    const tile = screen.getByRole("region", { name: "Sets this week" });
    expect(tile).toHaveTextContent("Sets this week1,250sets");
  });

  it("explains how the figure is counted, under it, when it has a hint", () => {
    render(<StatTile label="Current streak" value="4" unit="days" hint="Workdays only." />);
    expect(screen.getByRole("region", { name: "Current streak" })).toHaveTextContent(
      "Current streak4daysWorkdays only.",
    );
  });

  it("leaves the unit out when there is none", () => {
    render(<StatTile label="Personal best" value="76 kg e1RM" />);
    expect(screen.getByRole("region", { name: "Personal best" })).toHaveTextContent(
      "Personal best76 kg e1RM",
    );
  });
});

describe("Badge", () => {
  it("is a plain marker, with its tooltip", () => {
    render(<Badge title="Warm-up">W</Badge>);
    expect(screen.getByText("W")).toHaveAttribute("title", "Warm-up");
    expect(screen.queryByRole("button")).toBeNull();
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
      <Chip variant="entry" onRemove={onRemove} removeAriaLabel="Remove Plank from pool">
        Plank
      </Chip>,
    );
    expect(screen.getByText("Plank")).toBeInTheDocument();
    click("Remove Plank from pool");
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("has no button without onRemove", () => {
    render(<Chip variant="entry">Plank</Chip>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Segmented options with a name, a tooltip or disabled", () => {
  const OPTIONS = [
    { value: "1", label: "M", ariaLabel: "Monday", title: "Monday" },
    { value: "2", label: "T", disabled: true, title: "Taken" },
  ];

  it("names an option by its ariaLabel and shows its tooltip", () => {
    render(<Segmented options={OPTIONS} value="1" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Monday" })).toHaveAttribute("title", "Monday");
  });

  it("does not let a disabled option be picked", () => {
    const onChange = vi.fn();
    render(<Segmented options={OPTIONS} value="1" onChange={onChange} />);
    const tuesday = screen.getByRole("radio", { name: "T" });
    expect(tuesday).toBeDisabled();
    fireEvent.click(tuesday);
    expect(onChange).not.toHaveBeenCalled();
  });
});
