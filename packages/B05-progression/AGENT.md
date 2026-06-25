# B05 · @nabd/progression — suggestion & progression engine (pure)

Interface frozen in `src/index.ts`. Prototype refs: `suggest` (~L1298-1303),
sparkline `mkPoints` (~L1396), PR/gain in `buildProgress` (~L1405-1409),
full-history (~L1413-1422).

## Behavior
- `suggest(track, last)`: no `last`→ default `{sets:3,reps:10,weight:null,
  note:"",up:true}` adapted to track (weighted→weight 20 start; time→reps 30).
  With `last`: weighted track → `{sets:3, reps:last.reps, weight:last.weight+2.5,
  note:"+2.5 kg over last session", up:true}`; time track → `{reps:last.reps+5,
  weight:null, note:"+5 s over last session"}`; else `{reps:last.reps+1,
  weight:null, note:"+1 rep over last session"}`. `sets` always 3.
- `personalBest(series)`: max; empty→0.
- `estimate1RM(weight, reps)`: Epley `weight*(1+reps/30)`.
- `trendPoints(series,w,h,pad)`: map to `"x,y x,y …"`; x spread across `w-2pad`
  (single point→x=pad), y inverted by min/max with span guard (flat series→all at
  mid/top); 1-decimal fixed. Matches prototype `mkPoints`.
- `gain(series)`: `last-first`; empty→0; single→0.
- `fullHistorySeries(history, exId)`: best working-set value per session
  (group by date; weighted→estimate1RM else value), chronological.
- `formatGain(value, unit)`: sign-prefixed, integer if whole else 1 decimal,
  space + unit (e.g. `+2.5 kg`, `+1 rep`, `0 reps`).

## Test Cases
- suggest: each track family with/without last; note strings exact; sets=3.
- personalBest: normal + empty.
- estimate1RM: 100kg×5 → 116.67 (±epsilon); reps 0 → weight.
- trendPoints: 1 point; flat series; ascending; correct count + formatting.
- gain: empty/single/normal/negative.
- fullHistorySeries: groups per session, picks best, weighted uses 1RM, order.
- formatGain: positive/zero/negative, integer vs decimal, unit appended.

## Boundaries
Code agent edits only `packages/B05-progression/`. Tests RO.
