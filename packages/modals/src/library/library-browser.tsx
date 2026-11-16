import { Button, ChipGroup, EmptyNote, TEXT, TextInput } from "@nabd/design-system";
import type { LibraryActions } from "./library-actions";
import { LibraryRow } from "./library-row";
import { GROUP_OPTIONS } from "./library-vm";
import type { LibraryBrowserVM } from "./library-vm";

interface LibraryBrowserProps {
  browser: LibraryBrowserVM;
  actions: LibraryActions;
}

/** Find an exercise: a search box and group filter that stay put over a scrolling list. */
export function LibraryBrowser({ browser, actions }: LibraryBrowserProps): JSX.Element {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
          padding: "12px 20px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <TextInput
          type="search"
          value={browser.search}
          onChange={(search) => actions.filter({ search })}
          placeholder="Search exercises…"
          ariaLabel="Search exercises"
        />
        <ChipGroup
          ariaLabel="Muscle group"
          options={GROUP_OPTIONS}
          selected={[browser.group]}
          onToggle={(group) => actions.filter({ group: group === "all" ? null : group })}
        />
        {browser.scopeNote !== null && <div style={TEXT.hint}>{browser.scopeNote}</div>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 16px" }}>
        {browser.emptyNote !== null && (
          <div style={{ textAlign: "center" }}>
            <EmptyNote>{browser.emptyNote}</EmptyNote>
          </div>
        )}
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            margin: "0 0 11px",
            padding: 0,
            listStyle: "none",
          }}
        >
          {browser.rows.map((row) => (
            <LibraryRow key={row.id} row={row} actions={actions} />
          ))}
        </ul>
        <Button variant="ghost" tone="accent" dashed block onClick={() => actions.startDraft()}>
          Create custom exercise
        </Button>
      </div>
    </>
  );
}
