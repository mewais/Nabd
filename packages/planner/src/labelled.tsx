import type { ReactNode } from "react";
import { Row, Text } from "@nabd/design-system";

interface LabelledProps {
  label: string;
  children: ReactNode;
}

/** A compact control with its micro-label in front. */
export function Labelled({ label, children }: LabelledProps): JSX.Element {
  return (
    <Row gap="sm">
      <Text variant="eyebrow">{label}</Text>
      {children}
    </Row>
  );
}
