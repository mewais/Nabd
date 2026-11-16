import { Button, Card, Row, Text } from "@nabd/design-system";
import type { Notice } from "@nabd/view";
import type { ShellActions } from "./shell-actions";

interface NoticeBannerProps {
  vm: Notice;
  actions: Pick<ShellActions, "dismissNotice">;
}

/** Something the user must know wherever they are in the app, until they dismiss it. */
export function NoticeBanner({ vm, actions }: NoticeBannerProps): JSX.Element {
  const isError = vm.kind === "error";
  return (
    <Card variant="inset" tone={isError ? "accent" : "neutral"} padding="md">
      <Row role={isError ? "alert" : "status"} gap="md">
        <Text grow breakWords>
          {vm.text}
        </Text>
        <Button variant="link" tone="neutral" size="sm" onClick={actions.dismissNotice}>
          Dismiss
        </Button>
      </Row>
    </Card>
  );
}
