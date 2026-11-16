import { Chip, Icon, IconButton, RADIUS, RowButton, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { LibraryActions } from "./library-actions";
import type { LibraryRowVM } from "./library-vm";

interface LibraryRowProps {
  row: LibraryRowVM;
  actions: Pick<LibraryActions, "pickExercise" | "startDraft" | "deleteCustomExercise">;
}

/** One exercise: press it to add it; duplicate it into the form; delete it if it is custom. */
export function LibraryRow({ row, actions }: LibraryRowProps): JSX.Element {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <RowButton
        ariaLabel={row.addLabel}
        onClick={() => actions.pickExercise(row.id)}
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
            {row.name}
            {row.custom && (
              <Chip variant="tag" tone="accent">
                CUSTOM
              </Chip>
            )}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
            {row.detail}
          </span>
        </span>
        <Icon name="plus" size={16} strokeWidth={2.6} stroke="var(--accent)" />
      </RowButton>
      <IconButton icon="copy" label="Duplicate & edit" onClick={() => actions.startDraft(row.id)} />
      {row.custom && (
        <IconButton
          icon="trash"
          tone="danger"
          label="Delete custom exercise"
          onClick={() => actions.deleteCustomExercise(row.id)}
        />
      )}
    </li>
  );
}
