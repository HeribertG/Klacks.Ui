// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * SVG-based stacked bar chart for daily workforce capacity visualization (Resource Histogram).
 * Renders one bar per day (up to 365) with month-boundary labels on the x-axis,
 * supports multiple reference lines with individual styling and pixel-correct horizontal zoom.
 * @param bottomBars - Daily values for the bottom (green) bars
 * @param topBars - Daily values for the top (gray) bars, stacked above bottomBars
 * @param referenceLines - Array of reference lines drawn as polylines (color, dash, width per line)
 * @param monthMarkers - Month label positions: index into the data arrays and display label
 * @param unit - Suffix appended to Y-axis labels (e.g. ' MA')
 * @param zoomPercent - Horizontal zoom 100-400. ViewBox width scales proportionally so bars get
 *   wider while text stays pixel-stable (no stretching).
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

const BASE_VBW = 900;
const VBH = 220;
const PAD_L = 58;
const PAD_T = 15;
const PAD_R = 8;
const PAD_B = 25;
const PLOT_H = VBH - PAD_T - PAD_B;
const BAR_RATIO = 0.7;
const HEADROOM = 1.25;
const NICE_CANDIDATES = [1, 1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3, 3.5, 4, 5, 6, 7, 8, 10];
const TICK_CANDIDATES = [4, 5, 3, 6, 2];
const DEFAULT_TICK_COUNT = 4;
const MIN_ZOOM = 100;

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

export type SpecialDayType = 'saturday' | 'sunday' | 'holiday';

export interface ISpecialDay {
  index: number;
  type: SpecialDayType;
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
  @Input() specialDays: ISpecialDay[] = [];
  @Input() unit = 'h';
  @Input() zoomPercent = MIN_ZOOM;

  readonly vbH = VBH;
  readonly axisY = PAD_T + PLOT_H;
  readonly axisX = PAD_L;
  readonly plotTop = PAD_T;

  private get zoomFactor(): number {
    return Math.max(MIN_ZOOM, this.zoomPercent) / 100;
  }

  get vbW(): number {
    return BASE_VBW * this.zoomFactor;
  }

  get axisRight(): number {
    return this.vbW - PAD_R;
  }

  private get plotW(): number {
    return this.vbW - PAD_L - PAD_R;
  }

  private get count(): number {
    return Math.max(this.bottomBars.length, 1);
  }

  private get colW(): number {
    return this.plotW / this.count;
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
    const normalized = raw / mag;
    const pick = NICE_CANDIDATES.find(c => c >= normalized) ?? 10;
    return pick * mag;
  }

  private pickTickCount(max: number): number {
    if (!Number.isFinite(max) || max <= 0) return DEFAULT_TICK_COUNT;
    const scale = max >= 1 ? 1 : Math.pow(10, Math.ceil(-Math.log10(max)));
    const scaled = max * scale;
    const found = TICK_CANDIDATES.find(n => Math.abs((scaled / n) - Math.round(scaled / n)) < 1e-9);
    return found ?? DEFAULT_TICK_COUNT;
  }

  get yTicks(): IYTick[] {
    const max = this.maxY;
    const tickCount = this.pickTickCount(max);
    return Array.from({ length: tickCount + 1 }, (_, i) => {
      const value = (max / tickCount) * i;
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

  get specialDayRects(): { x: number; w: number; cssClass: string }[] {
    const colW = this.colW;
    const h = PLOT_H;
    return this.specialDays.map(sd => ({
      x: PAD_L + sd.index * colW,
      w: colW,
      h,
      cssClass: `chart-day--${sd.type}`,
    }));
  }
}
