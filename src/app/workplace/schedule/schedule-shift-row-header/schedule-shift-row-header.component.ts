import { Component, Input } from '@angular/core';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule-shift-row-header',
  templateUrl: './schedule-shift-row-header.component.html',
  styleUrls: ['./schedule-shift-row-header.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ScheduleShiftRowHeaderComponent {
  @Input() scheduleRowHeader: ScheduleScheduleRowHeaderComponent | undefined;
}
