import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-schedule-home',
    templateUrl: './schedule-home.component.html',
    styleUrls: ['./schedule-home.component.scss'],
    standalone: false
})
export class ScheduleHomeComponent {
  @Input() isSchedule: boolean = false;
}
