import { CENTERED } from "./styles";
import { COLOR, RADIUS } from "./tokens";

const ACCENT = COLOR.accent;

/** The vessels and highlights of the heart, drawn as strokes over its body. */
const HEART_STROKES = [
  { d: "M10.8 12 C10.2 9.2 10.1 7.4 10.4 5.8", stroke: COLOR.onAccent, width: 4 },
  { d: "M15 12.3 C14.8 9.4 15 7.4 15.6 5.9", stroke: COLOR.onAccent, width: 4 },
  { d: "M18.9 12.1 C19.4 8.7 21 6 24 5.4", stroke: COLOR.onAccent, width: 4.4 },
  { d: "M15.6 14.6 C15 19 14.9 25 16.2 31", stroke: ACCENT, width: 1.5 },
  { d: "M15.3 22.6 C13.7 24.6 12.7 27 12.3 29.4", stroke: ACCENT, width: 1.3 },
  { d: "M19.4 14.8 C20.6 18 20.8 22 19.7 26", stroke: ACCENT, width: 1.3 },
];

/** Side of the tile, in px. */
const SIZE = 36;

/** The Nabd logo: an anatomical heart on an accent tile. */
export function BrandMark(): JSX.Element {
  return (
    <div
      role="img"
      aria-label="Nabd"
      style={{
        ...CENTERED,
        width: SIZE,
        height: SIZE,
        borderRadius: RADIUS.control,
        background: ACCENT,
      }}
    >
      <svg width={22} height={25} viewBox="0 0 32 36" fill="none" aria-hidden>
        <path
          d="M17.5 33.8 C12.8 33.2 5.3 28 4 20.6 C3.3 16.8 4.6 12.6 8.6 12.2 C12.4 11.8 16.4 12 20.2 12.1 C24 12.2 26.8 14.6 26.7 18.4 C26.6 23.2 22.8 28.4 19 31.6 C18.4 32.2 17.9 33 17.5 33.8 Z"
          fill={COLOR.onAccent}
        />
        {HEART_STROKES.map(({ d, stroke, width }) => (
          <path key={d} d={d} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
        ))}
        <circle cx={10.4} cy={5.6} r={1.35} fill={ACCENT} />
        <circle cx={24.2} cy={5.3} r={1.45} fill={ACCENT} />
      </svg>
    </div>
  );
}
