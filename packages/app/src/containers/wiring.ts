// What every container does: build its view-model from the state it reads, and
// bind its screen's actions to the store's.

import { useMemo, useState } from "react";
import { sameList } from "@nabd/domain";
import type { NabdActions } from "@nabd/store";
import { useActions } from "../store-context";

/**
 * `build(input)`, built again only when a value of `input` changed (`input`
 * is written out in the same shape on every render, so its values line up).
 */
export function useViewModel<I extends object, V>(build: (input: I) => V, input: I): V {
  const [built, setBuilt] = useState(() => ({ input, vm: build(input) }));
  if (sameList(Object.values(built.input), Object.values(input))) return built.vm;
  const rebuilt = { input, vm: build(input) };
  setBuilt(rebuilt);
  return rebuilt.vm;
}

/** A screen's actions, bound once to the store's by `bind` (declared outside the component). */
export function useBoundActions<A>(bind: (store: NabdActions) => A): A {
  const store = useActions();
  return useMemo(() => bind(store), [bind, store]);
}
