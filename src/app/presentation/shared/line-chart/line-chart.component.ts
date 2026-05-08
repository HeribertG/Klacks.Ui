// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reusable SVG line chart with multiple series, month grid, and an optional today-marker.
 * @param series - Data series array; each series has label, color, dashed flag, and numeric data points
 * @param xMonthLabels - 12 month abbreviations for the X-axis (e.g. ['Jan','Feb',...])
 * @param todayIndex - Zero-based index of the current day (0–364) for the red vertical marker
 */
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { NgStyle } from '@angular/common';

export interface ILineChartSeries {
  label: string;
  color: string;
  dashed: boolean;
  data: number[];
}

interface ITooltip {
  visible: boolean;
  svgX: number;
  svgY: number;
  dayIndex: number;
  values: { label: string; color: string; value: number }[];
}

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  standalone: true,
  imports: [NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements OnChanges {
  @Input() series: ILineChartSeries[] = [];
  @Input() xMonthLabels: string[] = [];
  @Input() todayIndex?: number;

  private readonly VW = 900;
  private readonly VH = 220;
  private readonly PL = 50;   // padding left
  private readonly PR = 10;   // padding right
  private readonly PT = 16;   // padding top
  private readonly PB = 38;   // padding bottom

  get cw(): number { return this.VW - this.PL - this.PR; }
  get ch(): number { return this.VH - this.PT - this.PB; }

  polylines = signal<{ points: string; color: string; dashed: boolean }[]>([]);
  gridLines = signal<{ y: number; label: string }[]>([]);
  monthTicks = signal<{ x: number; label: string }[]>([]);
  todayX = signal<number | null>(null);
  tooltip = signal<ITooltip>({ visible: false, svgX: 0, svgY: 0, dayIndex: 0, values: [] });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['series'] || changes['xMonthLabels'] || changes['todayIndex']) {
      this.recalculate();
    }
  }

  private toX(i: number, len: number): number {
    return this.PL + (i / Math.max(len - 1, 1)) * this.cw;
  }

  private toY(v: number, maxV: number): number {
    return this.PT + this.ch - (v / Math.max(maxV, 1)) * this.ch;
  }

  private recalculate(): void {
    if (!this.series.length || !this.series[0].data.length) {
      this.polylines.set([]);
      return;
    }

    const len = this.series[0].data.length;
    const maxV = Math.max(...this.series.flatMap(s => s.data), 1);

    this.polylines.set(this.series.map(s => ({
      points: s.data.map((v, i) => `${this.toX(i, len)},${this.toY(v, maxV)}`).join(' '),
      color: s.color,
      dashed: s.dashed,
    })));

    const step = maxV / 4;
    this.gridLines.set([1, 2, 3, 4].map(n => ({
      y: this.toY(n * step, maxV),
      label: `${Math.round(n * step)}h`,
    })));

    // Month start day-indices for a 365-day year (non-leap)
    const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    this.monthTicks.set(monthStarts.map((start, i) => ({
      x: this.toX(Math.min(start, len - 1), len),
      label: this.xMonthLabels[i] ?? '',
    })));

    this.todayX.set(this.todayIndex != null ? this.toX(this.todayIndex, len) : null);
  }

  onMouseMove(event: MouseEvent, svgEl: SVGSVGElement): void {
    const rect = svgEl.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * this.VW;
    const chartX = relX - this.PL;
    const len = this.series[0]?.data.length ?? 365;
    const idx = Math.max(0, Math.min(len - 1, Math.round((chartX / this.cw) * (len - 1))));
    const maxV = Math.max(...this.series.flatMap(s => s.data), 1);

    this.tooltip.set({
      visible: true,
      svgX: this.toX(idx, len),
      svgY: this.toY(Math.max(...this.series.map(s => s.data[idx] ?? 0)), maxV),
      dayIndex: idx,
      values: this.series.map(s => ({ label: s.label, color: s.color, value: s.data[idx] ?? 0 })),
    });
  }

  onMouseLeave(): void {
    this.tooltip.update(t => ({ ...t, visible: false }));
  }

  tooltipStyle(rect: DOMRect): Record<string, string> {
    const t = this.tooltip();
    const pxX = (t.svgX / this.VW) * rect.width + 10;
    const pxY = (t.svgY / this.VH) * rect.height;
    return { left: `${pxX}px`, top: `${pxY}px` };
  }
}
