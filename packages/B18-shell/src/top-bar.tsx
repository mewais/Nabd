import {
  Button,
  FONT,
  Icon,
  IconButton,
  Segmented,
  TEXT,
  THEME_OPTIONS,
} from "@nabd/design-system";
import type { ShellActions } from "./actions";
import { StatusPill } from "./status-pill";
import type { TopBarVM } from "./view-model";

export interface TopBarProps {
  vm: TopBarVM;
  actions: ShellActions;
}

/** Greeting and date, the nudge status, and the app-wide switches. */
export function TopBar({ vm, actions }: TopBarProps): JSX.Element {
  return (
    <header
      style={{
        height: 66,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 26px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={TEXT.cardTitle}>{vm.greeting}</div>
        <div style={{ ...TEXT.cardSubtitle, fontFamily: FONT.mono }}>{vm.date}</div>
      </div>
      <StatusPill status={vm.status} />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <Segmented
          ariaLabel="Theme"
          options={THEME_OPTIONS}
          value={vm.theme}
          onChange={actions.setTheme}
        />
        <Button
          variant={vm.paused ? "primary" : "secondary"}
          size="sm"
          title={vm.paused ? "Resume nudges" : "Pause nudges"}
          onClick={actions.togglePause}
        >
          {vm.paused ? "Resume" : "Pause"}
        </Button>
        {vm.glassAvailable && (
          <Button
            variant={vm.glass ? "primary" : "secondary"}
            size="sm"
            title="Translucent window"
            pressed={vm.glass}
            onClick={() => actions.setGlass(!vm.glass)}
          >
            <Icon name="glass" size={14} strokeWidth={1.7} />
            Glass
          </Button>
        )}
        <IconButton icon="settings" label="Settings" onClick={actions.openSettings} />
      </div>
    </header>
  );
}
