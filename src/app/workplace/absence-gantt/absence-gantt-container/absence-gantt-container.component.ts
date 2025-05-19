import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Break, IBreak } from 'src/app/core/break-class';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { HScrollbarComponent } from 'src/app/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';
import { AbsenceGanttHeaderComponent } from '../absence-gantt-header/absence-gantt-header.component';
import { AbsenceGanttAbsenceListComponent } from '../absence-gantt-header/absence-gantt-absence-list/absence-gantt-absence-list.component';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';

@Component({
  selector: 'app-absence-gantt-container',
  templateUrl: './absence-gantt-container.component.html',
  styleUrls: ['./absence-gantt-container.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    AbsenceGanttHeaderComponent,
    AbsenceGanttAbsenceListComponent,
    AbsenceGanttMaskComponent,
    AbsenceGanttRowHeaderComponent,
    AbsenceGanttSurfaceComponent,
    HScrollbarComponent,
    VScrollbarComponent,
    ContextMenuComponent,
  ],
  providers: [ScrollbarService],
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
