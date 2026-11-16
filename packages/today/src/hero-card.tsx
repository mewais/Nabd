import { HeroNotice } from "./hero-notice";
import type { HeroVM } from "./hero-vm";
import { NextSetCard } from "./next-set-card";

interface HeroCardProps {
  vm: HeroVM;
  onStart: () => void;
  onSnooze: () => void;
  onLogOther: () => void;
}

/** The headline card: what to do next, or why there is nothing to do. */
export function HeroCard({ vm, onStart, onSnooze, onLogOther }: HeroCardProps): JSX.Element {
  return vm.kind === "next" ? (
    <NextSetCard vm={vm} onStart={onStart} onSnooze={onSnooze} onLogOther={onLogOther} />
  ) : (
    <HeroNotice vm={vm} onLogOther={onLogOther} />
  );
}
