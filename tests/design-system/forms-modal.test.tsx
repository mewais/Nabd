import { fireEvent, render, screen } from "@testing-library/react";
import {
  ConfirmDialog,
  Dropdown,
  FormRow,
  FormSection,
  ModalShell,
  Toggle,
} from "@nabd/design-system";
import { click, press } from "./render";

describe("FormSection", () => {
  it("groups its rows under a title", () => {
    render(<FormSection title="Workday">rows</FormSection>);
    const section = screen.getByRole("region", { name: "Workday" });
    expect(section).toHaveTextContent("Workday");
    expect(section).toHaveTextContent("rows");
  });
});

describe("FormRow", () => {
  it("shows the setting's name and hint next to its control", () => {
    render(
      <FormRow title="Start minimized" hint="Sit quietly in the tray.">
        <Toggle on={false} onChange={vi.fn()} />
      </FormRow>,
    );
    const row = screen.getByRole("group", { name: "Start minimized" });
    expect(row).toHaveTextContent("Sit quietly in the tray.");
    expect(row).toContainElement(screen.getByRole("switch"));
  });
});

describe("ModalShell", () => {
  const setup = (): ReturnType<typeof vi.fn> => {
    const onClose = vi.fn();
    render(
      <ModalShell
        title="Settings"
        eyebrow="Preferences"
        subtitle="Saved as you go"
        width="md"
        onClose={onClose}
      >
        <button>Inside</button>
      </ModalShell>,
    );
    return onClose;
  };
  const backdrop = (): Element => document.querySelector("[data-modal-backdrop]") as Element;

  it("is a modal dialog named by its title", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("Preferences");
    expect(dialog).toHaveTextContent("Saved as you go");
    expect(dialog).toContainElement(screen.getByRole("button", { name: "Inside" }));
  });

  it("closes from its close button", () => {
    const onClose = setup();
    click("Close");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = setup();
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const onClose = setup();
    press("Enter");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a click on the backdrop, but not on a click inside the panel", () => {
    const onClose = setup();
    click("Inside");
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(backdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stops listening for Escape once it is gone", () => {
    const onClose = vi.fn();
    const { unmount } = render(<ModalShell title="Gone" width="sm" onClose={onClose} />);
    unmount();
    press("Escape");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stacks above the layer it was opened from", () => {
    render(<ModalShell title="Below" width="sm" onClose={vi.fn()} />);
    render(<ModalShell title="Above" width="sm" layer="modalOver" onClose={vi.fn()} />);
    const [below, above] = [...document.querySelectorAll<HTMLElement>("[data-modal-backdrop]")];
    expect([below?.dataset.layer, above?.dataset.layer]).toEqual(["modal", "modalOver"]);
    expect(Number(above?.style.zIndex)).toBeGreaterThan(Number(below?.style.zIndex));
  });

  it("gives Escape to the modal on top only", () => {
    const closeBelow = vi.fn();
    const closeAbove = vi.fn();
    render(<ModalShell title="Below" width="sm" onClose={closeBelow} />);
    const above = render(
      <ModalShell title="Above" width="sm" layer="modalOver" onClose={closeAbove} />,
    );

    press("Escape");
    expect(closeAbove).toHaveBeenCalledTimes(1);
    expect(closeBelow).not.toHaveBeenCalled();

    above.unmount();
    press("Escape");
    expect(closeBelow).toHaveBeenCalledTimes(1);
  });

  it("lets an open dropdown inside it take Escape first", () => {
    const onClose = vi.fn();
    render(
      <ModalShell title="New exercise" width="md" onClose={onClose}>
        <Dropdown
          options={[{ value: "a", label: "Alpha" }]}
          value="a"
          onChange={vi.fn()}
          ariaLabel="Equipment"
        />
      </ModalShell>,
    );
    click("Equipment");

    press("Escape");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog", () => {
  const setup = () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Delete Push?"
        confirmLabel="Delete day"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        The day leaves your plan.
      </ConfirmDialog>,
    );
    return { onConfirm, onCancel };
  };

  it("asks its question in a dialog, saying what a yes will do", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Delete Push?" });
    expect(dialog).toHaveTextContent("The day leaves your plan.");
  });

  it("goes ahead only from its confirm button", () => {
    const { onConfirm, onCancel } = setup();
    click("Delete day");
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Cancel, the close button and Escape all cancel", () => {
    const { onConfirm, onCancel } = setup();
    click("Cancel");
    click("Close");
    press("Escape");
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("opens over every other dialog", () => {
    render(<ModalShell title="Top" width="sm" layer="modalTop" onClose={vi.fn()} />);
    setup();
    const [top, confirm] = [...document.querySelectorAll<HTMLElement>("[data-modal-backdrop]")];
    expect(confirm?.dataset.layer).toBe("confirm");
    expect(Number(confirm?.style.zIndex)).toBeGreaterThan(Number(top?.style.zIndex));
  });
});
