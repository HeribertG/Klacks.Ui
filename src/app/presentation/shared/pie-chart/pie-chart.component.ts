// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed
} from '@angular/core';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartSlice {
  path: string;
  color: string;
  label: string;
  value: number;
  percentage: string;
  hoverTransform: string;
}

interface PieChartGeometry {
  total: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  slices: PieChartSlice[];
}

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieChartComponent {
  readonly data = input<PieChartData[]>([]);
  readonly width = input(400);
  readonly height = input(400);
  readonly showTotal = input(true);

  public hoveredIndex = -1;

  private readonly geometry = computed<PieChartGeometry>(() => this.calculateChart());

  get slices(): PieChartSlice[] {
    return this.geometry().slices;
  }
  get total(): number {
    return this.geometry().total;
  }
  get centerX(): number {
    return this.geometry().centerX;
  }
  get centerY(): number {
    return this.geometry().centerY;
  }
  get outerRadius(): number {
    return this.geometry().outerRadius;
  }
  get innerRadius(): number {
    return this.geometry().innerRadius;
  }

  private calculateChart(): PieChartGeometry {
    const data = this.data();
    const total = data?.reduce((sum, item) => sum + item.value, 0) ?? 0;
    const centerX = this.width() / 2;
    const centerY = this.height() / 2;
    const outerRadius = Math.min(this.width(), this.height()) / 2 - 20;
    const innerRadius = outerRadius * 0.8;

    if (!data || data.length === 0 || total === 0) {
      return { total, centerX, centerY, outerRadius, innerRadius, slices: [] };
    }

    let currentAngle = -90;
    const hoverOffset = 12;

    const slices = data.map((item) => {
      const percentage = ((item.value / total) * 100).toFixed(1);
      const rawAngle = (item.value / total) * 360;
      const angle = rawAngle >= 360 ? 359.9999 : rawAngle;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      const midAngle = startAngle + angle / 2;

      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      const midAngleRad = (midAngle * Math.PI) / 180;

      const outerX1 = centerX + outerRadius * Math.cos(startAngleRad);
      const outerY1 = centerY + outerRadius * Math.sin(startAngleRad);
      const outerX2 = centerX + outerRadius * Math.cos(endAngleRad);
      const outerY2 = centerY + outerRadius * Math.sin(endAngleRad);

      const innerX1 = centerX + innerRadius * Math.cos(startAngleRad);
      const innerY1 = centerY + innerRadius * Math.sin(startAngleRad);
      const innerX2 = centerX + innerRadius * Math.cos(endAngleRad);
      const innerY2 = centerY + innerRadius * Math.sin(endAngleRad);

      const hoverX = hoverOffset * Math.cos(midAngleRad);
      const hoverY = hoverOffset * Math.sin(midAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${outerX1} ${outerY1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}`,
        `L ${innerX2} ${innerY2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`,
        'Z',
      ].join(' ');

      currentAngle = endAngle;

      return {
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: `${percentage}%`,
        hoverTransform: `translate(${hoverX}px, ${hoverY}px)`,
      };
    });

    return { total, centerX, centerY, outerRadius, innerRadius, slices };
  }
}
