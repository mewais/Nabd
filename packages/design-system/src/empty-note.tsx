import type { ReactNode } from "react";
import { Stack } from "./stack";
import { Text } from "./text";

interface EmptyNoteProps {
  children?: ReactNode;
  /** In the middle of the space it stands in for (an empty list), instead of at its start. */
  centred?: boolean;
}

/** The quiet sentence a card or list shows while it has nothing to show yet. */
export function EmptyNote({ children, centred = false }: EmptyNoteProps): JSX.Element {
  return (
    <Stack paddingY="md">
      <Text as="p" tone="faint" align={centred ? "center" : undefined}>
        {children}
      </Text>
    </Stack>
  );
}
