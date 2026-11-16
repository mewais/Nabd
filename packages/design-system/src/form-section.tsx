import type { ReactNode } from "react";
import { Stack } from "./stack";
import { Text } from "./text";

interface FormSectionProps {
  title: string;
  children?: ReactNode;
}

/** A titled group of form rows or a single labelled field. */
export function FormSection({ title, children }: FormSectionProps): JSX.Element {
  return (
    <Stack as="section" ariaLabel={title} gap="sm">
      <Text variant="eyebrow">{title}</Text>
      <div>{children}</div>
    </Stack>
  );
}
