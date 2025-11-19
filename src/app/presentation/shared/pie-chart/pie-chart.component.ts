
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

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
})
export class PieChartComponent implements OnChanges {
  @Input() data: PieChartData[] = [];
  @Input() width = 400;
  @Input() height = 400;

  public slices: {
    path: string;
    color: string;
    label: string;
    value: number;
    percentage: string;
  }[] = [];

  public centerX = 0;
  public centerY = 0;
  public radius = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['width'] || changes['height']) {
      this.calculateChart();
    }
  }

  private calculateChart(): void {
    if (!this.data || this.data.length === 0) {
      this.slices = [];
      return;
    }

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.width, this.height) / 2 - 20;

    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90;

    this.slices = this.data.map((item) => {
      const percentage = ((item.value / total) * 100).toFixed(1);
      const angle = (item.value / total) * 360;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;

      const x1 = this.centerX + this.radius * Math.cos(startAngleRad);
      const y1 = this.centerY + this.radius * Math.sin(startAngleRad);
      const x2 = this.centerX + this.radius * Math.cos(endAngleRad);
      const y2 = this.centerY + this.radius * Math.sin(endAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${this.centerX} ${this.centerY}`,
        `L ${x1} ${y1}`,
        `A ${this.radius} ${this.radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      currentAngle = endAngle;

      return {
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: `${percentage}%`,
      };
    });
  }
}
