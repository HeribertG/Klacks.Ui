// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieChartComponent implements OnChanges {
  @Input() data: PieChartData[] = [];
  @Input() width = 400;
  @Input() height = 400;
  @Input() showTotal = true;

  public slices: {
    path: string;
    color: string;
    label: string;
    value: number;
    percentage: string;
    hoverTransform: string;
  }[] = [];

  public hoveredIndex = -1;
  public centerX = 0;
  public centerY = 0;
  public outerRadius = 0;
  public innerRadius = 0;
  public total = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['width'] || changes['height']) {
      this.calculateChart();
    }
  }

  private calculateChart(): void {
    this.total = this.data?.reduce((sum, item) => sum + item.value, 0) ?? 0;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.outerRadius = Math.min(this.width, this.height) / 2 - 20;
    this.innerRadius = this.outerRadius * 0.8;

    if (!this.data || this.data.length === 0 || this.total === 0) {
      this.slices = [];
      return;
    }
    let currentAngle = -90;

    const hoverOffset = 12;

    this.slices = this.data.map((item) => {
      const percentage = ((item.value / this.total) * 100).toFixed(1);
      const rawAngle = (item.value / this.total) * 360;
      const angle = rawAngle >= 360 ? 359.9999 : rawAngle;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      const midAngle = startAngle + angle / 2;

      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      const midAngleRad = (midAngle * Math.PI) / 180;

      const outerX1 = this.centerX + this.outerRadius * Math.cos(startAngleRad);
      const outerY1 = this.centerY + this.outerRadius * Math.sin(startAngleRad);
      const outerX2 = this.centerX + this.outerRadius * Math.cos(endAngleRad);
      const outerY2 = this.centerY + this.outerRadius * Math.sin(endAngleRad);

      const innerX1 = this.centerX + this.innerRadius * Math.cos(startAngleRad);
      const innerY1 = this.centerY + this.innerRadius * Math.sin(startAngleRad);
      const innerX2 = this.centerX + this.innerRadius * Math.cos(endAngleRad);
      const innerY2 = this.centerY + this.innerRadius * Math.sin(endAngleRad);

      const hoverX = hoverOffset * Math.cos(midAngleRad);
      const hoverY = hoverOffset * Math.sin(midAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${outerX1} ${outerY1}`,
        `A ${this.outerRadius} ${this.outerRadius} 0 ${largeArcFlag} 1 ${outerX2} ${outerY2}`,
        `L ${innerX2} ${innerY2}`,
        `A ${this.innerRadius} ${this.innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`,
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
  }
}
