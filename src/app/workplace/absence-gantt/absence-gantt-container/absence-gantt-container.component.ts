import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Break, IBreak } from 'src/app/core/break-class';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

@Component({
  selector: 'app-absence-gantt-container',
  templateUrl: './absence-gantt-container.component.html',
  styleUrls: ['./absence-gantt-container.component.scss'],
})
export class AbsenceGanttContainerComponent implements OnInit {
  @Output() refreshEvent = new EventEmitter();
  @Output() changeCalendar = new EventEmitter();

  public IsInfoVisible = false;
  public maxSize = 0;

  constructor(
    private dataManagementBreakService: DataManagementBreakService,
    private dataManagementSwitchboardService: DataManagementSwitchboardService
  ) {}

  ngOnInit(): void {
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementBreakService';
  }

  onShowErrorMessage(value: string) {
    this.dataManagementBreakService.showError(
      value,
      'AbsenceGanttContainerComponent-Error'
    );
  }

  onUpdate(selectedBreak: IBreak) {
    this.dataManagementBreakService.dataBreakService.updateBreak(
      selectedBreak as Break
    );
  }
}
