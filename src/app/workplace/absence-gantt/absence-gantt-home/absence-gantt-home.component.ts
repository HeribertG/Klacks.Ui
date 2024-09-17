import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-absence-gantt-home',
  templateUrl: './absence-gantt-home.component.html',
  styleUrls: ['./absence-gantt-home.component.scss'],
})
export class AbsenceGanttHomeComponent {
  @Input() isAbsence: boolean = false;
}
