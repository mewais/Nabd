import {
  Button,
  COMMON_WORDS,
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
        <Button
          variant={vm.pause.paused ? "primary" : "secondary"}
          size="sm"
          title={vm.pause.title}
          onClick={actions.togglePause}
        >
          {vm.pause.label}
        </Button>
        <Button
          variant={vm.today.on ? "primary" : "secondary"}
          size="sm"
          onClick={vm.today.toggles === "skip" ? actions.toggleSkipToday : actions.toggleNudgeToday}
        >
          {vm.today.label}
        </Button>
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
