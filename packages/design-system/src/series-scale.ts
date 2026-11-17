/** The drawing area of a line chart: its size and the padding kept clear on every side. */
interface ChartBox {
  width: number;
  height: number;
  pad: number;
}

/** Maps a series onto a `ChartBox`: its lowest value on the bottom line, its highest on the top. */
interface SeriesScale {
  min: number;
  max: number;
  /** The y of `value`. A flat series sits on the middle line. */
  y: (value: number) => number;
  /** The series as the `points` of an SVG polyline. */
  points: string;
}

export function seriesScale(series: readonly number[], box: ChartBox): SeriesScale {
  const { width, height, pad } = box;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const xStep = series.length > 1 ? (width - 2 * pad) / (series.length - 1) : 0;
  const x = (index: number): number => pad + index * xStep;
  const y = (value: number): number => {
    const level = span === 0 ? 0.5 : (value - min) / span;
    return pad + (1 - level) * (height - 2 * pad);
  };
  const points = series.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
  return { min, max, y, points: points.join(" ") };
}
