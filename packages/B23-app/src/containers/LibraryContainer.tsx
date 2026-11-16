import { useMemo } from "react";
import type { MuscleGroup, MuscleKey } from "@nabd/domain";
import { EQUIPMENT_NAMES, MUSCLES, MUSCLE_GROUPS, MUSCLE_NAMES, TRACK_NAMES } from "@nabd/domain";
import { LibraryModal } from "@nabd/modals";
import type { LibraryItem } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import type { LibraryTarget } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

const ALL_GROUPS = "";

function titleFor(target: LibraryTarget): string {
  switch (target.kind) {
    case "exercise":
      return "Add Exercise";
    case "pool":
      return `Add to Pool — ${MUSCLE_NAMES[target.muscle]}`;
    case "extra":
      return "Log Something Else";
  }
}

const toggled = (list: MuscleKey[], muscle: MuscleKey): MuscleKey[] =>
  list.includes(muscle) ? list.filter((m) => m !== muscle) : [...list, muscle];

export function LibraryContainer(): JSX.Element | null {
  const actions = useActions();
  const { target, search, group, draft } = useNabd((s) => s.library);
  const library = useNabd(selectLibrary);
  const owned = useNabd((s) => s.settings.equipment);

  const items = useMemo<LibraryItem[]>(
    () =>
      library
        .find({ text: search, group: group ?? undefined, equipment: new Set(owned) })
        .map((ex) => ({
          id: ex.id,
          name: ex.name,
          muscles: [...ex.primary, ...ex.secondary].map((m) => MUSCLE_NAMES[m]).join(", "),
          trackLabel: TRACK_NAMES[ex.tracking],
          equip: EQUIPMENT_NAMES[ex.equipment],
          custom: ex.custom === true,
        })),
    [library, search, group, owned],
  );

  if (target === null) return null;
  const muscleChips = (selected: MuscleKey[] | undefined) =>
    MUSCLES.map((m) => ({ k: m, label: MUSCLE_NAMES[m], active: selected?.includes(m) ?? false }));

  return (
    <LibraryModal
      title={titleFor(target)}
      creating={draft !== null}
      search={search}
      groupChips={[ALL_GROUPS, ...MUSCLE_GROUPS].map((g) => ({
        k: g,
        label: g === ALL_GROUPS ? "All" : g,
        active: (group ?? ALL_GROUPS) === g,
      }))}
      items={items}
      emptyMsg="No exercises match — check the filter, or your equipment in Settings."
      draftName={draft?.name ?? ""}
      draftTrack={draft?.tracking ?? "weight_reps"}
      draftEquip={draft?.equipment ?? "bodyweight"}
      primaryChips={muscleChips(draft?.primary)}
      secondaryChips={muscleChips(draft?.secondary)}
      onClose={actions.closeLibrary}
      onSearch={(text) => actions.patchLibrary({ search: text })}
      onGroup={(g) => actions.patchLibrary({ group: g === ALL_GROUPS ? null : (g as MuscleGroup) })}
      onPick={actions.pickExercise}
      onCopy={actions.startDraft}
      onDeleteCustom={actions.deleteCustomExercise}
      onStartCreate={() => actions.startDraft()}
      onCancelCreate={actions.cancelDraft}
      onDraftName={(name) => actions.patchDraft({ name })}
      onDraftTrack={(tracking) => actions.patchDraft({ tracking })}
      onDraftEquip={(equipment) => actions.patchDraft({ equipment })}
      onTogglePrimary={(m) =>
        draft && actions.patchDraft({ primary: toggled(draft.primary, m as MuscleKey) })
      }
      onToggleSecondary={(m) =>
        draft && actions.patchDraft({ secondary: toggled(draft.secondary, m as MuscleKey) })
      }
      onCreate={actions.saveDraft}
    />
  );
}
