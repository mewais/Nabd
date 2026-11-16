import { Chip, Icon, IconButton, Row, RowButton, TitleBlock } from "@nabd/design-system";
import type { LibraryActions } from "./library-actions";
import type { LibraryRowVM } from "./library-vm";

interface LibraryRowProps {
  vm: LibraryRowVM;
  actions: Pick<LibraryActions, "pick" | "startDraft" | "deleteCustom">;
}

/** One exercise: press it to add it; duplicate it into the form; delete it if it is custom. */
export function LibraryRow({ vm, actions }: LibraryRowProps): JSX.Element {
  const customTag = (
    <Chip variant="tag" tone="accent">
      CUSTOM
    </Chip>
  );
  return (
    <Row as="li" gap="sm">
      <RowButton variant="boxed" ariaLabel={vm.addLabel} onClick={() => actions.pick(vm.id)}>
        <Row as="span" gap="md">
          <TitleBlock
            size="row"
            title={vm.name}
            subtitle={vm.detail}
            tag={vm.custom ? customTag : undefined}
            inline
            grow
          />
          <Icon name="plus" size={16} strokeWidth={2.6} tone="accent" />
        </Row>
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
    </Row>
  );
}
