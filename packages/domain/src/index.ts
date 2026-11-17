// @nabd/domain — the vocabulary every other package shares: the persisted
// model (types + zod schemas) with its name tables and rules, what a machine
// can do, and the small helpers everything is written with: local dates,
// numbers, lists, JSON and text. Its modules import one another directly;
// this is what other packages use of it.

export {
  GROUP_PRIMARY_MUSCLE,
  MUSCLES,
  MUSCLES_ANATOMICAL,
  MUSCLE_GROUPS,
  MUSCLE_NAMES,
  MUSCLE_PRIMARY_GROUP,
} from "./muscles";
export type { Coverage, MuscleGroup, MuscleKey } from "./muscles";
export { EQUIPMENT_KEYS, EQUIPMENT_NAMES } from "./equipment";
export type { Equipment } from "./equipment";
export {
  MAX_AMOUNT,
  SECONDS_STEP,
  TRACKING_KEYS,
  TRACK_NAMES,
  isAssisted,
  isBodyweightLoaded,
  isTimeBased,
  isWeighted,
  measureOf,
  needsLoad,
} from "./tracking";
export type { Measure, TrackingType } from "./tracking";
export {
  CustomExercisesSchema,
  ExerciseSchema,
  exerciseName,
  formatMuscles,
  muscleList,
  muscleNames,
} from "./exercise";
export type { Exercise, ExerciseLookup } from "./exercise";
export { EMPTY_DRAFT, draftCopyOf, exerciseFromDraft, isCompleteDraft } from "./exercise-draft";
export type { ExerciseDraft } from "./exercise-draft";
export {
  EMPTY_PROGRAM,
  ProgramSchema,
  firstDay,
  inWeekOrder,
  isFloating,
  poolMeasure,
  supersetTags,
} from "./program";
export type {
  CycledSlot,
  Day,
  ExercisePrescription,
  Program,
  ProgramType,
  Schedule,
} from "./program";
export {
  LoggedSetSchema,
  TRIGGERS,
  TRIGGER_NAMES,
  exerciseOfSet,
  isWarmup,
  loggedSet,
} from "./history";
export type { LoggedSet, SetDay, Trigger } from "./history";
export { DayLogSchema, DayStateSchema, RotationStateSchema, freshDayState } from "./day-state";
export type {
  CarriedItem,
  CarriedItems,
  CarriedVisit,
  DayOverride,
  DayRecord,
  DayState,
  ExtraItem,
  RotationState,
  TodayChoice,
} from "./day-state";
export {
  INTENSITIES,
  INTENSITY_NAMES,
  INTENSITY_SCALES,
  NO_SETS,
  SET_TYPES,
  SET_TYPE_NAMES,
  SetTypeSchema,
  countSets,
  measureOfMode,
  totalSets,
  workingSets,
} from "./prescription";
export type { Intensity, Prescription, RepMode, SetCounts, SetSpec, SetType } from "./prescription";
export {
  ENTERED_DECIMALS,
  MAX_LOAD_KG,
  WEIGHT_UNITS,
  boundedLoad,
  editableWeight,
  formatWeight,
  inUnit,
  kgFromDisplay,
  roundKg,
} from "./weight";
export type { WeightUnit } from "./weight";
export {
  DEFAULT_SETTINGS,
  SETTING_STEPS,
  SettingsSchema,
  THEMES,
  THEME_NAMES,
  hasWorkingHours,
  isWorkday,
  loadStepKg,
  salvageSettings,
  withWeightUnit,
} from "./settings";
export type { NumericSetting, Settings, Theme } from "./settings";
export { NO_CAPABILITIES, glassInEffect } from "./platform";
export type { GlassBackdrop, PlatformCapabilities } from "./platform";
export { APPDATA_VERSION, APP_NAME, AppDataSchema } from "./appdata";
export type { AppData } from "./appdata";
export {
  DAYS_PER_WEEK,
  WEEKDAYS,
  WEEK_ORDER,
  addDays,
  atMinuteOfDay,
  dateKey,
  formatClock,
  formatMinuteOfDay,
  isWeekday,
  monthAndDay,
  monthName,
  parseDateKey,
  startOfDay,
  startOfWeek,
  weekdayInitial,
  weekdayName,
  weekdayOf,
  weekdayShort,
} from "./dates";
export type { Weekday } from "./dates";
export { clamp, percentOf, roundTo, sum } from "./numbers";
export type { Direction } from "./numbers";
export { sameList, sameRecord, toggled } from "./lists";
export { isRecord } from "./json";
export { formatAmount, formatDuration, formatGain, plural } from "./text";
export type { AdviceWording } from "./text";
