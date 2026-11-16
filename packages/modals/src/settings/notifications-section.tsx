import { Button, FormRow, FormSection } from "@nabd/design-system";
import type { SettingsActions } from "./settings-actions";

interface NotificationsSectionProps {
  actions: Pick<SettingsActions, "sendTestNotification">;
}

/** A way to check that the desktop shows Nabd's notifications. */
export function NotificationsSection({ actions }: NotificationsSectionProps): JSX.Element {
  return (
    <FormSection title="Notifications">
      <FormRow
        title="Desktop notification"
        hint="A set due while Nabd is in the background is announced by your desktop."
      >
        <Button variant="ghost" size="sm" onClick={actions.sendTestNotification}>
          Send test notification
        </Button>
      </FormRow>
    </FormSection>
  );
}
