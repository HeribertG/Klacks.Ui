import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
})
export class ScheduleHomeComponent {
  @Input() isSchedule: boolean = false;
}
