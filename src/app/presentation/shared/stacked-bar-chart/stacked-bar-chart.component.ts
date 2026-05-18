// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SVG-based stacked bar chart for daily workforce capacity visualization (Resource Histogram).
 * Renders one bar per day (up to 365) with month-boundary labels on the x-axis.
 * @param bottomBars - Daily values for the bottom (green) bars, e.g. service hours
 * @param topBars - Daily values for the top (gray) bars, e.g. absence hours stacked on green
 * @param referenceLine - Daily values drawn as a red dashed polyline (constructed capacity ceiling)
 * @param monthMarkers - Month label positions: index into the data arrays and display label
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
  @Input() referenceLine: number[] = [];
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
    const maxRef = Math.max(0, ...this.referenceLine);
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

  get referencePoints(): string {
    const max = this.maxY;
    const colW = this.colW;
    return this.referenceLine
      .map((val, i) => {
        const x = PAD_L + (i + 0.5) * colW;
        const y = PAD_T + PLOT_H - (val / max) * PLOT_H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
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
