import type { ReactNode } from "react";
import { Row } from "./row";
import { Stack } from "./stack";
import { TitleBlock } from "./title-block";

interface FormRowProps {
  title: string;
  /** One line explaining the setting. */
  hint: string;
  /** Put the control under the text instead of beside it (for wide controls). */
  stacked?: boolean;
  /** The control. */
  children?: ReactNode;
}

/** One setting: its name and a hint, with the control beside or under them. */
export function FormRow({ title, hint, stacked = false, children }: FormRowProps): JSX.Element {
  const text = <TitleBlock size="row" title={title} subtitle={hint} grow />;
  return stacked ? (
    <Stack role="group" ariaLabel={title} gap="sm" paddingY="sm">
      {text}
      {children}
    </Stack>
  ) : (
    <Row role="group" ariaLabel={title} gap="lg" paddingY="sm">
      {text}
      {children}
    </Row>
  );
}
