import {
  Button,
  Icon,
  IconButton,
  Row,
  Segmented,
  Spacer,
  THEME_OPTIONS,
  TitleBlock,
} from "@nabd/design-system";
import type { ShellActions } from "./shell-actions";
import type { TopBarVM } from "./shell-vm";
import { StatusPill } from "./status-pill";

interface TopBarProps {
  vm: TopBarVM;
  actions: ShellActions;
}

/** Greeting and date, the nudge status, and the app-wide switches. */
export function TopBar({ vm, actions }: TopBarProps): JSX.Element {
  return (
    <Row as="header" surface edge="bottom" gap="xl" paddingX="xxl" paddingY="lg">
      <TitleBlock title={vm.greeting} subtitle={vm.date} mono />
      <StatusPill vm={vm.status} />
      <Spacer />
      <Row gap="md">
        <Segmented
          ariaLabel="Theme"
          options={THEME_OPTIONS}
          value={vm.theme}
          onChange={actions.setTheme}
        />
        <Button
          variant={vm.pause.paused ? "primary" : "secondary"}
          size="sm"
          title={vm.pause.title}
          onClick={actions.togglePause}
        >
          {vm.pause.label}
        </Button>
        {vm.glassAvailable && (
          <Button
            variant={vm.glass ? "primary" : "secondary"}
            size="sm"
            title="Translucent window"
            on={vm.glass}
            onClick={() => actions.setGlass(!vm.glass)}
          >
            <Icon name="glass" size="sm" weight="thin" />
            Glass
          </Button>
        )}
        <IconButton icon="settings" ariaLabel="Settings" onClick={actions.openSettings} />
      </Row>
    </Row>
  );
}
