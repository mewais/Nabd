import { Card, Divider, LiveDot, Row, Text } from "@nabd/design-system";
import type { StatusVM } from "./shell-vm";

interface StatusPillProps {
  vm: StatusVM;
}

/** The clock and where nudging stands; it lights up while a set is due. */
export function StatusPill({ vm }: StatusPillProps): JSX.Element {
  return (
    <Card variant="inset" padding="sm">
      <Row role="status" gap="md" paddingX="xs">
        <Row gap="sm">
          <LiveDot on={vm.due} />
          <Text as="span" variant="mono">
            {vm.clock}
          </Text>
        </Row>
        <Divider vertical />
        <Text as="span" variant="mono" tone={vm.due ? "accent" : "faint"}>
          {vm.line}
        </Text>
      </Row>
    </Card>
  );
}
