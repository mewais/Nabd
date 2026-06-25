// @nabd/planner — Plan screen: program header, week board, day editor (fixed
// set tables + supersets + cycled slots), coverage rail. Pure view-model builders
// + presentational React. Mutations are callbacks (wired to the store in B23).
// SKELETON: signatures frozen; bodies throw until implemented.

import type {
  Program,
  Day,
  Exercise,
  ExercisePrescription,
  CycledSlot,
  SetSpec,
  RepMode,
  Intensity,
  MuscleGroup,
  GymProfile,
} from "@nabd/domain";
import type { Library } from "@nabd/dataset";

const NI = (): never => {
  throw new Error("not implemented");
};

export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}

// ---------- view-model builders (pure) ----------

export interface SetRowVM {
  index: number;
  badgeLabel: string; // "W" / "1".. / "D"
  badgeKind: "warm" | "work" | "drop";
  typeName: string;
  repA: number;
  repB: number | null;
  repsStr: string; // "8–10" / "12" / "45s"
  isTime: boolean;
  hasB: boolean;
  showInt: boolean;
  intStr: string; // "8" / "70%"
}
export interface SetBlockVM {
  rows: SetRowVM[];
  repMode: RepMode;
  intensity: Intensity;
  showIntCol: boolean;
  repHeader: string; // "REPS" / "TIME"
  intHeader: string; // "RPE" / "%1RM" / ""
  gridCols: string;
  restStr: string; // "2:30"
  notes: string;
}
/** Build the set-table view model for an exercise prescription or cycled slot. */
export function buildSetBlock(_p: ExercisePrescription | CycledSlot): SetBlockVM {
  return NI();
}

export interface ExerciseCardVM {
  id: string;
  name: string;
  muscles: string;
  equip: string;
  block: SetBlockVM;
  supersetTag: string | null; // "A1"/"A2" within a superset, else null
}
export interface CycledSlotVM {
  id: string;
  group: MuscleGroup;
  muscle: string;
  poolNames: { id: string; name: string }[];
  poolStr: string;
  block: SetBlockVM;
}
export type EditorRow =
  | { kind: "ex"; ex: ExerciseCardVM }
  | { kind: "superset"; members: ExerciseCardVM[] }
  | { kind: "slot"; slot: CycledSlotVM };

export interface EditorVM {
  exists: boolean;
  dayId: string;
  name: string;
  isFixed: boolean;
  isWeekday: boolean;
  dayOrderLabel: string;
  weekday: number | null;
  summary: string;
  rows: EditorRow[];
}
/** Build the day-editor view model. */
export function buildEditor(_program: Program, _editDayId: string | null, _library: Library): EditorVM {
  return NI();
}

export interface BoardChip {
  name: string;
  superset: boolean;
}
export interface BoardColVM {
  kind: "day" | "rest" | "add";
  label: string;
  weekday?: number;
  dayId?: string;
  name?: string;
  chips?: BoardChip[];
  more?: number;
  editing?: boolean;
}
/** Build the week-board columns. */
export function buildBoard(_program: Program, _profile: GymProfile, _editDayId: string | null): BoardColVM[] {
  return NI();
}

// ---------- components ----------

/** All planner mutation callbacks (wired to the store). */
export interface PlannerCallbacks {
  onSetType: (t: "fixed" | "cycled") => void;
  onSetSchedule: (s: "weekday" | "floating") => void;
  onToggleProfileMenu: () => void;
  onSetProfile: (id: string) => void;
  onSelectDay: (dayId: string) => void;
  onRenameDay: (dayId: string, name: string) => void;
  onSetWeekday: (dayId: string, weekday: number) => void;
  onAddDay: (weekday: number | null) => void;
  onRemoveDay: (dayId: string) => void;
  onAddExercise: (dayId: string) => void; // opens library
  onRemoveExercise: (dayId: string, rowId: string) => void;
  onToggleSuperset: (dayId: string, rowId: string) => void;
  onAddSlot: (dayId: string, group: MuscleGroup) => void;
  onRemoveSlot: (dayId: string, slotId: string) => void;
  onAddPool: (dayId: string, slotId: string) => void; // opens library
  onRemoveFromPool: (dayId: string, slotId: string, exId: string) => void;
  onEdit: (dayId: string, ref: EditRef, op: string, ...args: number[]) => void;
  onNotes: (dayId: string, ref: EditRef, notes: string) => void;
}

export interface SetTableProps {
  dayId: string;
  refTarget: EditRef;
  block: SetBlockVM;
  cb: PlannerCallbacks;
}
export function SetTable(_p: SetTableProps): JSX.Element {
  return NI();
}

export interface ProgramHeaderProps {
  name: string;
  type: "fixed" | "cycled";
  schedule: "weekday" | "floating";
  profileName: string;
  profiles: GymProfile[];
  activeProfileId: string;
  profileMenuOpen: boolean;
  cb: PlannerCallbacks;
}
export function ProgramHeader(_p: ProgramHeaderProps): JSX.Element {
  return NI();
}

export interface WeekBoardProps {
  columns: BoardColVM[];
  cb: PlannerCallbacks;
}
export function WeekBoard(_p: WeekBoardProps): JSX.Element {
  return NI();
}

export interface DayEditorProps {
  editor: EditorVM;
  groups: MuscleGroup[];
  cb: PlannerCallbacks;
}
export function DayEditor(_p: DayEditorProps): JSX.Element {
  return NI();
}

export interface PlannerScreenProps {
  program: Program;
  library: Library;
  profile: GymProfile;
  profiles: GymProfile[];
  activeProfileId: string;
  profileMenuOpen: boolean;
  editDayId: string | null;
  /** per-muscle planned volume bars for the coverage rail. */
  volumeBars: { muscle: string; name: string; sets: number; pct: number }[];
  coverage: import("@nabd/domain").Coverage;
  cb: PlannerCallbacks;
}
export function PlannerScreen(_p: PlannerScreenProps): JSX.Element {
  return NI();
}
