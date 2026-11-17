import { Card, Chip, IconButton, Row, Spacer, Stack, Text } from "@nabd/design-system";
import type { SessionActions } from "./session-actions";
import type { LoggedSetVM } from "./session-vm";
import { WORDS } from "../wording";

interface LoggedSetsProps {
  vm: LoggedSetVM[];
  actions: Pick<SessionActions, "undoSet">;
}

/** The sets of this exercise logged today, each of which can be deleted. */
export function LoggedSets({ vm, actions }: LoggedSetsProps): JSX.Element {
  return (
    <Stack as="section" ariaLabel={WORDS.loggedToday} gap="sm">
      <Text variant="eyebrow">{WORDS.loggedToday}</Text>
      <Stack as="ul" gap="xs">
        {vm.map((set) => (
          <Card as="li" key={set.id} variant="inset" padding="sm">
            <Row gap="sm" paddingX="xs">
              <Text as="span" variant="hint" tone="muted">
                {set.label}
              </Text>
              {set.unsaved && (
                <Chip variant="tag" tone="accent">
                  {WORDS.notSavedYet}
                </Chip>
              )}
              <Spacer />
              <Text as="span" variant="monoValue">
                {set.text}
              </Text>
              <IconButton
                icon="close"
                variant="plain"
                ariaLabel={set.deleteLabel}
                onClick={() => actions.undoSet(set.id)}
              />
            </Row>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
