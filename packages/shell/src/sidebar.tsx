import { NavButton, Spacer, Stack } from "@nabd/design-system";
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
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.screen}
            icon={item.icon}
            label={item.label}
            active={item.screen === vm.screen}
            onClick={() => actions.navigate(item.screen)}
          />
        ))}
      </Stack>
      <Spacer />
      <DayProgressRing vm={vm.progress} />
    </Stack>
  );
}
