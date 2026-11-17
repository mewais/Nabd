import {
  Button,
  COMMON_WORDS,
  Icon,
  IconButton,
  MenuButton,
  Row,
  Segmented,
  Spacer,
  THEME_OPTIONS,
  TitleBlock,
} from "@nabd/design-system";
import type { ShellActions } from "./shell-actions";
import type { TopBarVM } from "./shell-vm";
import { StatusPill } from "./status-pill";
import { WORDS } from "./wording";

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
          ariaLabel={COMMON_WORDS.theme}
          options={THEME_OPTIONS}
          value={vm.theme}
          onChange={actions.setTheme}
        />
        <MenuButton
          label={vm.nudgeMenu.label}
          items={vm.nudgeMenu.items}
          variant={vm.nudgeMenu.changed ? "primary" : "secondary"}
          size="sm"
          onPick={(action) => actions[action]()}
        />
        {vm.glassAvailable && (
          <Button
            variant={vm.glass ? "primary" : "secondary"}
            size="sm"
            title={COMMON_WORDS.translucentWindow}
            on={vm.glass}
            onClick={() => actions.setGlass(!vm.glass)}
          >
            <Icon name="glass" size="sm" weight="thin" />
            {WORDS.glass}
          </Button>
        )}
        <IconButton
          icon="settings"
          ariaLabel={COMMON_WORDS.settings}
          onClick={actions.openSettings}
        />
      </Row>
    </Row>
  );
}
