import {
  Component,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
  output,
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
  refreshEvent = output<void>();
  changeCalendar = output<void>();

  absenceBody = viewChild.required<AbsenceGanttSurfaceComponent>('absenceBody');
  absenceRowHeader =
    viewChild.required<AbsenceGanttRowHeaderComponent>('absenceRowHeader');
  hScrollbar = viewChild.required<HScrollbarComponent>('hScrollbar');
  vScrollbar = viewChild.required<VScrollbarComponent>('vScrollbar');
  absenceMask = viewChild.required<AbsenceGanttMaskComponent>('absenceMask');
  contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');

  private dataManagementBreakService = inject(DataManagementBreakService);
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private toastShowService = inject(ToastShowService);
  private scrollService = inject(ScrollService);

  public IsInfoVisible = signal(false);
  public vScrollbarSize = signal(17);
  public hScrollbarSize = signal(17);
  public hScrollbarValue = signal(0);
  public vScrollbarValue = signal(0);
  public hScrollbarMaxValue = signal(0);
  public vScrollbarMaxValue = signal(0);
  public hScrollbarVisibleValue = signal(0);
  public vScrollbarVisibleValue = signal(0);

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;

  constructor() {
    effect(() => {
      const isLocked = this.scrollService.lockedRows();
      this.vScrollbarSize.set(isLocked ? 0 : this.defaultVScrollbarSize);
      this.updateScrollbarSizes();
    });

    effect(() => {
      const isLocked = this.scrollService.lockedCols();
      this.hScrollbarSize.set(isLocked ? 0 : this.defaultHScrollbarSize);
      this.updateScrollbarSizes();
    });
  }

  ngOnInit(): void {
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementBreakService';
  }

  onHScrollbarValueChange(value: number): void {
    this.hScrollbarValue.set(value);
  }

  onVScrollbarValueChange(value: number): void {
    this.vScrollbarValue.set(value);
  }

  onHScrollbarMaxValueChange(value: number): void {
    this.hScrollbarMaxValue.set(value);
  }

  onVScrollbarMaxValueChange(value: number): void {
    this.vScrollbarMaxValue.set(value);
  }

  onHScrollbarVisibleValueChange(value: number): void {
    this.hScrollbarVisibleValue.set(value);
  }

  onVScrollbarVisibleValueChange(value: number): void {
    this.vScrollbarVisibleValue.set(value);
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

  onChangeIndex(index: number): void {
    this.absenceBody().onChangeIndex(index);
  }

  get selectedRow(): number {
    return this.absenceBody().drawCalendarGantt.selectedRow;
  }

  get selectedBreakIndex(): number {
    return this.absenceBody().drawCalendarGantt.selectedBreakIndex;
  }

  get selectedRowBreaksMaxIndex(): number | undefined {
    return this.absenceBody().drawCalendarGantt.selectedRowBreaksMaxIndex;
  }

  get selectedBreak(): IBreak | undefined {
    return this.absenceBody().drawCalendarGantt.selectedBreak;
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-absence-gantt-container'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-gantt-scrollbar-size',
        `${this.vScrollbarSize()}px`
      );
      hostElement.style.setProperty(
        '--h-gantt-scrollbar-size',
        `${this.hScrollbarSize()}px`
      );
    }
  }
}
