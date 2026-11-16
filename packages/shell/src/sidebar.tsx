import { NavButton } from "@nabd/design-system";
import { BrandLockup } from "./brand-lockup";
import { DayProgressRing } from "./day-progress-ring";
import { NAV_ITEMS } from "./options";
import type { ShellActions } from "./shell-actions";
import type { SidebarVM } from "./shell-vm";

interface SidebarProps {
  vm: SidebarVM;
  actions: Pick<ShellActions, "navigate">;
}

const WIDTH = 250;

/** The left rail: brand, the screens, and today's progress at the bottom. */
export function Sidebar({ vm, actions }: SidebarProps): JSX.Element {
  return (
    <aside
      style={{
        width: WIDTH,
        flexShrink: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "22px 18px",
        background: "var(--surface)",
        borderRight: "1px solid var(--line)",
      }}
    >
      <BrandLockup versionLabel={vm.versionLabel} />
      <nav style={{ display: "flex", flexDirection: "column" }}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.screen}
            icon={item.icon}
            label={item.label}
            active={item.screen === vm.screen}
            onClick={() => actions.navigate(item.screen)}
          />
        ))}
      </nav>
      <DayProgressRing vm={vm.progress} />
    </aside>
  );
}
