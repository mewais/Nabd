import { NavButton } from "@nabd/design-system";
import { BrandLockup } from "./brand-lockup";
import { DayProgressRing } from "./day-progress-ring";
import type { Screen } from "@nabd/domain";
import { NAV_ITEMS } from "./nav-items";
import type { SidebarVM } from "./view-model";

interface SidebarProps {
  vm: SidebarVM;
  onNavigate: (screen: Screen) => void;
}

const WIDTH = 250;

/** The left rail: brand, the screens, and today's progress at the bottom. */
export function Sidebar({ vm, onNavigate }: SidebarProps): JSX.Element {
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
            onClick={() => onNavigate(item.screen)}
          />
        ))}
      </nav>
      <DayProgressRing progress={vm.progress} />
    </aside>
  );
}
