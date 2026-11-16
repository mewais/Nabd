import { Chip, Icon, IconButton, RADIUS, RowButton, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { LibraryActions } from "./library-actions";
import type { LibraryRowVM } from "./library-vm";

interface LibraryRowProps {
  vm: LibraryRowVM;
  actions: Pick<LibraryActions, "pick" | "startDraft" | "deleteCustom">;
}

/** One exercise: press it to add it; duplicate it into the form; delete it if it is custom. */
export function LibraryRow({ vm, actions }: LibraryRowProps): JSX.Element {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <RowButton
        ariaLabel={vm.addLabel}
        onClick={() => actions.pick(vm.id)}
        style={{
          ...SURFACE2_BOX,
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxSizing: "border-box",
          borderRadius: RADIUS.button,
          padding: "12px 14px",
          color: "var(--text)",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...TEXT.label, display: "flex", alignItems: "center", gap: 7 }}>
            {vm.name}
            {vm.custom && (
              <Chip variant="tag" tone="accent">
                CUSTOM
              </Chip>
            )}
          </span>
          <span style={{ ...TEXT.cardSubtitle, display: "block", marginTop: 2 }}>{vm.detail}</span>
        </span>
        <Icon name="plus" size={16} strokeWidth={2.6} stroke="var(--accent)" />
      </RowButton>
      <IconButton
        icon="copy"
        ariaLabel="Duplicate & edit"
        onClick={() => actions.startDraft(vm.id)}
      />
      {vm.custom && (
        <IconButton
          icon="trash"
          tone="danger"
          ariaLabel="Delete custom exercise"
          onClick={() => actions.deleteCustom(vm.id)}
        />
      )}
    </li>
  );
}
