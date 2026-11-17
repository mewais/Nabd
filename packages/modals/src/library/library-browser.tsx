import {
  Button,
  ChipGroup,
  EmptyNote,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@nabd/design-system";
import { GROUP_OPTIONS } from "../options";
import type { LibraryActions } from "./library-actions";
import { LibraryRow } from "./library-row";
import type { LibraryBrowserVM } from "./library-vm";
import { WORDS } from "../wording";

interface LibraryBrowserProps {
  vm: LibraryBrowserVM;
  actions: LibraryActions;
}

/** Find an exercise: a search box and group filter that stay put over a scrolling list. */
export function LibraryBrowser({ vm, actions }: LibraryBrowserProps): JSX.Element {
  return (
    <>
      <Stack gap="sm" paddingX="xl" paddingY="md" edge="bottom">
        <TextInput
          type="search"
          value={vm.search}
          onChange={(search) => actions.filter({ search })}
          placeholder={WORDS.searchPlaceholder}
          ariaLabel={WORDS.search}
        />
        <ChipGroup
          ariaLabel={WORDS.muscleGroup}
          options={GROUP_OPTIONS}
          selected={[vm.group]}
          onToggle={({ value }) => actions.filter({ group: value === "all" ? null : value })}
        />
        {vm.scopeNote !== null && <Text variant="hint">{vm.scopeNote}</Text>}
      </Stack>
      <ScrollArea grow paddingX="xl" paddingY="md">
        <Stack gap="md">
          {vm.emptyNote !== null && <EmptyNote centred>{vm.emptyNote}</EmptyNote>}
          {vm.rows.length > 0 && (
            <Stack as="ul" gap="sm">
              {vm.rows.map((row) => (
                <LibraryRow key={row.id} vm={row} actions={actions} />
              ))}
            </Stack>
          )}
          <Button variant="add" tone="accent" block onClick={() => actions.startDraft()}>
            {WORDS.createCustom}
          </Button>
        </Stack>
      </ScrollArea>
    </>
  );
}
