import { AdviceCard, Button, Card, Chip, Eyebrow, FONT } from "@nabd/design-system";
import type { NextSetVM } from "./hero-vm";

export interface NextSetCardProps {
  vm: NextSetVM;
  onStart: () => void;
  onSnooze: () => void;
  onLogOther: () => void;
}

/** The next set: the exercise, what the plan and the coach ask for, and the ways to act on it. */
export function NextSetCard({ vm, onStart, onSnooze, onLogOther }: NextSetCardProps): JSX.Element {
  return (
    <Card padding={24} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow tone="accent">{vm.kicker}</Eyebrow>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>{vm.label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
        {vm.exercise}
      </div>
      {vm.target !== null && (
        <div style={{ fontFamily: FONT.mono, fontSize: 13, color: "var(--text2)" }}>
          {vm.target}
        </div>
      )}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {vm.muscleNames.map((name) => (
          <Chip key={name}>{name}</Chip>
        ))}
      </div>
      {vm.notes !== "" && (
        <div style={{ fontSize: 12.5, color: "var(--text3)", fontStyle: "italic" }}>{vm.notes}</div>
      )}
      {vm.advice !== null && <AdviceCard advice={vm.advice} />}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={onStart}>Start set</Button>
        {vm.due && (
          <Button variant="ghost" onClick={onSnooze}>
            {vm.snoozeLabel}
          </Button>
        )}
        <Button variant="ghost" onClick={onLogOther}>
          Log something else
        </Button>
        <span style={{ fontSize: 12, color: vm.due ? "var(--accent)" : "var(--text3)" }}>
          {vm.nudgeLine}
        </span>
      </div>
    </Card>
  );
}
