import { Eyebrow, IconButton, RADIUS, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { LoggedSetVM } from "./session-vm";

interface LoggedSetsProps {
  sets: LoggedSetVM[];
  onUndo: (setId: string) => void;
}

/** The sets of this exercise logged today, each of which can be deleted. */
export function LoggedSets({ sets, onUndo }: LoggedSetsProps): JSX.Element {
  return (
    <section aria-label="Logged today" style={{ marginTop: 18 }}>
      <Eyebrow style={{ marginBottom: 9 }}>Logged today</Eyebrow>
      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {sets.map((set) => (
          <li
            key={set.id}
            style={{
              ...SURFACE2_BOX,
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: RADIUS.chip,
              padding: "8px 11px",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: "var(--text2)" }}>{set.label}</span>
            <span style={{ ...TEXT.monoValue, marginLeft: "auto" }}>{set.text}</span>
            <IconButton
              icon="close"
              variant="plain"
              ariaLabel={set.deleteLabel}
              onClick={() => onUndo(set.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
