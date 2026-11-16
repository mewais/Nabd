import type { CSSProperties } from "react";
import { FONT, RADIUS, shade } from "@nabd/design-system";
import { LegendSwatch } from "./legend-swatch";
import { CHART_CAPTION } from "./styles";
import type { CalendarLevel, CalendarVM } from "./view-model";

const LEVEL_COLORS: Record<CalendarLevel, { background: string; text: string }> = {
  future: { background: "transparent", text: "transparent" },
  none: { background: "var(--surface2)", text: "var(--text3)" },
  light: { background: shade("var(--accent)", 24), text: "var(--text2)" },
  medium: { background: shade("var(--accent)", 50), text: "var(--text2)" },
  full: { background: "var(--accent)", text: "var(--surface)" },
};
const LEGEND_LEVELS: readonly CalendarLevel[] = ["none", "light", "medium", "full"];

const WEEK_GRID: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 };
const CELL: CSSProperties = {
  height: 30,
  borderRadius: RADIUS.chip,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FONT.mono,
  fontSize: 11,
  userSelect: "none",
};

/** The current month as a grid of days, tinted by how much was trained on each. */
export function CalendarView({ calendar }: { calendar: CalendarVM }): JSX.Element {
  return (
    <div>
      <div style={{ ...CHART_CAPTION, marginBottom: 10 }}>{calendar.month}</div>
      <div style={{ ...WEEK_GRID, marginBottom: 6 }}>
        {calendar.weekdays.map((weekday, index) => (
          <div key={index} style={{ ...CHART_CAPTION, fontSize: 9.5, textAlign: "center" }}>
            {weekday}
          </div>
        ))}
      </div>
      <div style={WEEK_GRID}>
        {calendar.cells.map(({ day, level }) => (
          <div
            key={day}
            style={{
              ...CELL,
              gridColumnStart: day === 1 ? calendar.firstWeekday + 1 : undefined,
              background: LEVEL_COLORS[level].background,
              color: LEVEL_COLORS[level].text,
            }}
          >
            {level === "future" ? null : day}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          fontSize: 11,
          color: "var(--text3)",
        }}
      >
        Less
        {LEGEND_LEVELS.map((level) => (
          <LegendSwatch key={level} color={LEVEL_COLORS[level].background} size={13} />
        ))}
        More
      </div>
    </div>
  );
}
