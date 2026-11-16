import { Button, FormRow, FormSection } from "@nabd/design-system";

interface NotificationsSectionProps {
  onTest: () => void;
}

/** A way to check that the desktop shows Nabd's notifications. */
export function NotificationsSection({ onTest }: NotificationsSectionProps): JSX.Element {
  return (
    <FormSection title="Notifications">
      <FormRow
        title="Desktop notification"
        hint="A set due while Nabd is in the background is announced by your desktop."
      >
        <Button variant="ghost" size="sm" onClick={onTest} style={{ flex: "none" }}>
          Send test notification
        </Button>
      </FormRow>
    </FormSection>
  );
}
