import { Button, FormRow, FormSection } from "@nabd/design-system";
import type { SettingsActions } from "./settings-actions";
import { WORDS } from "../wording";

interface NotificationsSectionProps {
  actions: Pick<SettingsActions, "sendTestNotification">;
}

/** A way to check that the desktop shows Nabd's notifications. */
export function NotificationsSection({ actions }: NotificationsSectionProps): JSX.Element {
  return (
    <FormSection title={WORDS.notifications}>
      <FormRow title={WORDS.desktopNotification} hint={WORDS.desktopNotificationHint}>
        <Button variant="ghost" size="sm" onClick={actions.sendTestNotification}>
          {WORDS.testNotification}
        </Button>
      </FormRow>
    </FormSection>
  );
}
