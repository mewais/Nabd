import { Icon, RowButton, Spacer, Stack } from "@nabd/design-system";
import { BrandLockup } from "./brand-lockup";
import { DayProgressRing } from "./day-progress-ring";
import { NAV_ITEMS } from "./options";
import type { ShellActions } from "./shell-actions";
import type { SidebarVM } from "./shell-vm";

interface SidebarProps {
  vm: SidebarVM;
  actions: Pick<ShellActions, "navigate">;
}

/** The left rail: brand, the screens, and today's progress at the bottom. */
export function Sidebar({ vm, actions }: SidebarProps): JSX.Element {
  return (
    <Stack as="aside" surface edge="right" gap="xl" paddingX="lg" paddingY="xl">
      <BrandLockup versionLabel={vm.versionLabel} />
      <Stack as="nav">
        {NAV_ITEMS.map((item) => {
          const selected = item.screen === vm.screen;
          return (
            <RowButton
              key={item.screen}
              variant="nav"
              selected={selected}
              onClick={() => actions.navigate(item.screen)}
            >
              <Icon name={item.icon} size="lg" tone={selected ? "accent" : "neutral"} />
              {item.label}
            </RowButton>
          );
        })}
      </Stack>
      <Spacer />
      <DayProgressRing vm={vm.progress} />
    </Stack>
  );
}
