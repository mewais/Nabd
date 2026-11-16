/** The drawing area of a line chart: its size and the padding kept clear on every side. */
export interface ChartBox {
  width: number;
  height: number;
  pad: number;
}

/** Maps a series onto a `ChartBox`: its lowest value on the bottom line, its highest on the top. */
export interface SeriesScale {
  min: number;
  max: number;
  /** The x of the `index`-th value. */
  x: (index: number) => number;
  /** The y of `value`. A flat series sits on the middle line. */
  y: (value: number) => number;
}

export function seriesScale(series: readonly number[], box: ChartBox): SeriesScale {
  const { width, height, pad } = box;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const xStep = series.length > 1 ? (width - 2 * pad) / (series.length - 1) : 0;
  return {
    min,
    max,
    x: (index) => pad + index * xStep,
    y: (value) => {
      const level = span === 0 ? 0.5 : (value - min) / span;
      return pad + (1 - level) * (height - 2 * pad);
    },
  };
}
