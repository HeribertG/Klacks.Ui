import {
  Component,
  effect,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { Break, IBreak } from 'src/app/core/break-class';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { HScrollbarComponent } from 'src/app/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { AngularSplitModule } from 'angular-split';
import { CommonModule } from '@angular/common';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Component({
  selector: 'app-absence-gantt-container',
  templateUrl: './absence-gantt-container.component.html',
  styleUrls: ['./absence-gantt-container.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    AbsenceGanttRowHeaderComponent,
    AbsenceGanttSurfaceComponent,
    HScrollbarComponent,
    VScrollbarComponent,
    ContextMenuComponent,
    AbsenceGanttMaskComponent,
  ],
  providers: [ScrollbarService],
})
export class AbsenceGanttContainerComponent implements OnInit {
  @Output() refreshEvent = new EventEmitter();
  @Output() changeCalendar = new EventEmitter();

  private dataManagementBreakService = inject(DataManagementBreakService);
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private toastShowService = inject(ToastShowService);
  private scrollService = inject(ScrollService);

  public IsInfoVisible = false;
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;

  constructor() {
    effect(() => {
      const isLocked = this.scrollService.lockedRows();
      this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
      this.updateScrollbarSizes();
    });

    effect(() => {
      const isLocked = this.scrollService.lockedCols();
      this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
      this.updateScrollbarSizes();
    });
  }

  ngOnInit(): void {
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementBreakService';
  }

  onShowErrorMessage(value: string) {
    this.toastShowService.showError(
      value,
      'AbsenceGanttContainerComponent-Error'
    );
  }

  onUpdate(selectedBreak: IBreak) {
    this.dataManagementBreakService.dataBreakService.updateBreak(
      selectedBreak as Break
    );
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-absence-gantt-container'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-gantt-scrollbar-size',
        `${this.vScrollbarSize}px`
      );
      hostElement.style.setProperty(
        '--h-gantt-scrollbar-size',
        `${this.hScrollbarSize}px`
      );
    }
  }
}
