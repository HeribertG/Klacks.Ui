import {
  Component,
  effect,
  inject,
  signal,
  viewChild,
  output,
} from '@angular/core';
import { BreakPlaceholder, IBreakPlaceholder } from 'src/app/domain/models/break-class';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/absence/data-management-break-placeholder.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { HScrollbarComponent } from 'src/app/presentation/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/presentation/shared/v-scrollbar/v-scrollbar.component';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { AngularSplitModule } from 'angular-split';

import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { GanttPdfExportService } from '../services/gantt-pdf-export.service';

@Component({
  selector: 'app-absence-gantt-container',
  templateUrl: './absence-gantt-container.component.html',
  styleUrls: ['./absence-gantt-container.component.scss'],
  standalone: true,
  imports: [
    AngularSplitModule,
    AbsenceGanttRowHeaderComponent,
    AbsenceGanttSurfaceComponent,
    HScrollbarComponent,
    VScrollbarComponent,
    ContextMenuComponent,
    AbsenceGanttMaskComponent
],
  providers: [ScrollbarService],
})
export class AbsenceGanttContainerComponent {
  refreshEvent = output<void>();
  changeCalendar = output<void>();

  absenceBody = viewChild.required<AbsenceGanttSurfaceComponent>('absenceBody');
  absenceRowHeader =
    viewChild.required<AbsenceGanttRowHeaderComponent>('absenceRowHeader');
  hScrollbar = viewChild.required<HScrollbarComponent>('hScrollbar');
  vScrollbar = viewChild.required<VScrollbarComponent>('vScrollbar');
  absenceMask = viewChild.required<AbsenceGanttMaskComponent>('absenceMask');
  contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');

  private dataManagementBreakService = inject(DataManagementBreakPlaceholderService);
  private workplaceStateService = inject(WorkplaceStateService);
  private toastShowService = inject(ToastShowService);
  private scrollService = inject(ScrollService);
  private ganttPdfExportService = inject(GanttPdfExportService);

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

    effect(() => {
      this.dataManagementBreakService.resetScrollPositionTrigger();
      this.scrollService.verticalScrollPosition = 0;
      this.vScrollbarValue.set(0);
    });
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

  onUpdate(index: number, selectedBreak: IBreakPlaceholder) {
    this.dataManagementBreakService.updateBreak(index, selectedBreak as BreakPlaceholder);
  }

  onChangeIndex(index: number): void {
    this.absenceBody().onChangeIndex(index);
  }

  onBreakIdSelected(breakPlaceholderId: string): void {
    this.absenceBody().selectBreakById(breakPlaceholderId);
    this.absenceBody().showSelectedBreak();
  }

  async onPdfExportRequested(): Promise<void> {
    try {
      await this.ganttPdfExportService.exportTest2DDrawing();
    } catch (error) {
      this.toastShowService.showError('PDF export failed', error?.toString());
    }
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

  get selectedBreak(): IBreakPlaceholder | undefined {
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
