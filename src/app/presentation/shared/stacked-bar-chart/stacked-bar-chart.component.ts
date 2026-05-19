// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SVG-based stacked bar chart for daily workforce capacity visualization (Resource Histogram).
 * Renders one bar per day (up to 365) with month-boundary labels on the x-axis,
 * supports multiple reference lines with individual styling.
 * @param bottomBars - Daily values for the bottom (green) bars
 * @param topBars - Daily values for the top (gray) bars, stacked above bottomBars
 * @param referenceLines - Array of reference lines drawn as polylines (color, dash, width per line)
 * @param monthMarkers - Month label positions: index into the data arrays and display label
 * @param unit - Suffix appended to Y-axis labels (e.g. ' MA')
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

const VIEWBOX_W = 900;
const VIEWBOX_H = 220;
const PAD_L = 58;
const PAD_T = 15;
const PAD_R = 8;
const PAD_B = 25;
const PLOT_W = VIEWBOX_W - PAD_L - PAD_R;
const PLOT_H = VIEWBOX_H - PAD_T - PAD_B;
const BAR_RATIO = 0.7;
const Y_TICKS = 4;
const HEADROOM = 1.12;

interface IBarRect {
  x: number;
  greenY: number;
  greenH: number;
  grayY: number;
  grayH: number;
}

interface IYTick {
  y: number;
  label: string;
}

export interface IMonthMarker {
  index: number;
  label: string;
}

export interface IReferenceLine {
  values: number[];
  color: string;
  dashArray: string;
  strokeWidth: number;
}

interface IRenderedReferenceLine {
  points: string;
  color: string;
  dashArray: string;
  strokeWidth: number;
}

@Component({
  selector: 'app-stacked-bar-chart',
  templateUrl: './stacked-bar-chart.component.html',
  styleUrls: ['./stacked-bar-chart.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackedBarChartComponent {
  @Input() bottomBars: number[] = [];
  @Input() topBars: number[] = [];
  @Input() referenceLines: IReferenceLine[] = [];
  @Input() monthMarkers: IMonthMarker[] = [];
  @Input() unit = 'h';

  readonly vbW = VIEWBOX_W;
  readonly vbH = VIEWBOX_H;
  readonly axisY = PAD_T + PLOT_H;
  readonly axisX = PAD_L;
  readonly axisRight = PAD_L + PLOT_W;

  private get count(): number {
    return Math.max(this.bottomBars.length, 1);
  }

  private get colW(): number {
    return PLOT_W / this.count;
  }

  get barW(): number {
    return Math.max(this.colW * BAR_RATIO, 0.5);
  }

  private get maxY(): number {
    const maxStack = Math.max(
      0,
      ...this.bottomBars.map((b, i) => b + (this.topBars[i] ?? 0))
    );
    const maxRef = this.referenceLines.length === 0
      ? 0
      : Math.max(0, ...this.referenceLines.flatMap(line => line.values));
    const raw = Math.max(maxStack, maxRef) * HEADROOM;
    return raw === 0 ? 1 : this.niceMax(raw);
  }

  private niceMax(raw: number): number {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return nice * mag;
  }

  get yTicks(): IYTick[] {
    const max = this.maxY;
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = (max / Y_TICKS) * i;
      const y = PAD_T + PLOT_H - (value / max) * PLOT_H;
      const formatted = value >= 10 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, '');
      return { y, label: `${formatted}${this.unit}` };
    });
  }

  get bars(): IBarRect[] {
    const max = this.maxY;
    const colW = this.colW;
    const bw = this.barW;
    const bottom = PAD_T + PLOT_H;
    return this.bottomBars.map((dienst, i) => {
      const absenz = this.topBars[i] ?? 0;
      const x = PAD_L + i * colW + (colW - bw) / 2;
      const greenH = (dienst / max) * PLOT_H;
      const grayH = (absenz / max) * PLOT_H;
      return { x, greenY: bottom - greenH, greenH, grayY: bottom - greenH - grayH, grayH };
    });
  }

  get renderedReferenceLines(): IRenderedReferenceLine[] {
    const max = this.maxY;
    const colW = this.colW;
    return this.referenceLines.map(line => ({
      points: line.values
        .map((val, i) => {
          const x = PAD_L + (i + 0.5) * colW;
          const y = PAD_T + PLOT_H - (val / max) * PLOT_H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' '),
      color: line.color,
      dashArray: line.dashArray,
      strokeWidth: line.strokeWidth,
    }));
  }

  get monthLabelPositions(): { x: number; label: string }[] {
    const colW = this.colW;
    return this.monthMarkers.map(m => ({
      x: PAD_L + m.index * colW,
      label: m.label,
    }));
  }

  get monthDividers(): number[] {
    const colW = this.colW;
    return this.monthMarkers
      .filter(m => m.index > 0)
      .map(m => PAD_L + m.index * colW);
  }
}
