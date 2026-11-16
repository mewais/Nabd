import type { ProgramType } from "@nabd/domain";
import { Eyebrow, Segmented, TitleInput } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import { useProgramActions } from "./use-actions";
import type { HeaderVM } from "./view-model";

export interface ProgramHeaderProps {
  header: HeaderVM;
}

const TYPES: readonly SegOption<ProgramType>[] = [
  { k: "fixed", label: "Fixed" },
  { k: "cycled", label: "Cycled" },
];

/** The program's name, and the two choices that shape it: plan type and schedule. */
export function ProgramHeader({ header }: ProgramHeaderProps): JSX.Element {
  const actions = useProgramActions();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div>
        <Eyebrow>Program</Eyebrow>
        <TitleInput ariaLabel="Program name" value={header.name} onChange={actions.rename} />
      </div>
      <Segmented
        ariaLabel="Plan type"
        options={TYPES}
        value={header.type}
        onChange={actions.setType}
      />
      <Segmented
        ariaLabel="Schedule"
        options={header.scheduleOptions}
        value={header.schedule}
        onChange={actions.setSchedule}
      />
    </div>
  );
}
