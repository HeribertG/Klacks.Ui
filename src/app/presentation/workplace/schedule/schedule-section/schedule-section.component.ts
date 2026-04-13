// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main component for displaying the employee schedule grid.
 * Shows work assignments, breaks, and changes for all clients.
 * Supports context menus, drag-and-drop, and keyboard navigation.
 *
 * @param horizontalSize - Width of the row header area in pixels
 * @param zoom - Zoom factor for the grid display
 * @param refreshTrigger - Signal for forcing a grid redraw
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  effect,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  EffectRef,
  Injector,
  input,
  output,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from './schedule-schedule-row-header/schedule-schedule-row-header.component';
import { HScrollbarComponent } from 'src/app/presentation/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/presentation/shared/v-scrollbar/v-scrollbar.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/presentation/workplace/schedule/schedule-section/services/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/presentation/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseCreateHeaderService } from 'src/app/presentation/shared/grid/services/body/create-header.service';
import { BaseCreateCellService } from 'src/app/presentation/shared/grid/services/body/create-cell.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { Subject, takeUntil } from 'rxjs';
import {
  CellValueChangeEvent,
  GridSurfaceRightClickEvent,
  GridSurfaceTemplateComponent,
} from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { TooltipState } from '../services/schedule-tooltip.service';
import { ShiftDropResult } from '../services/shift-to-schedule-drag-drop.service';
import { ScheduleDataService } from './services/schedule-data.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { CorrectionDialogComponent } from '../dialogs/correction-dialog/correction-dialog.component';
import { ReplacementDialogComponent } from '../dialogs/replacement-dialog/replacement-dialog.component';
import { WorkEditDialogComponent } from '../dialogs/work-edit-dialog/work-edit-dialog.component';
import { ExpensesDialogComponent } from '../dialogs/expenses-dialog/expenses-dialog.component';
import { ContainerWorkEditDialogComponent } from '../dialogs/container-work-edit-dialog/container-work-edit-dialog.component';
import { AvailableShift } from 'src/app/domain/models/schedule/available-shift';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { ScheduleContextMenuService } from './services/schedule-context-menu.service';
import { ScheduleEntryActionsService } from './services/schedule-entry-actions.service';
import { ScheduleDialogService } from './services/schedule-dialog.service';
import { ScheduleDragDropService } from './services/schedule-drag-drop.service';
import { ScheduleNavigationService } from './services/schedule-navigation.service';
import { GridDoubleClickEvent } from 'src/app/presentation/shared/grid/body/directives/grid-template-events.directive';
import { ScheduleBreakBarRenderService } from './services/schedule-break-bar-render.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { ScheduleSectionFacadeService } from './services/schedule-section-facade.service';
import { DirectionService } from 'src/app/application/services/direction.service';

@Component({
  selector: 'app-schedule-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleScheduleRowHeaderComponent,
    HScrollbarComponent,
    VScrollbarComponent,
    GridSurfaceTemplateComponent,
    ContextMenuComponent,
    CorrectionDialogComponent,
    ReplacementDialogComponent,
    WorkEditDialogComponent,
    ExpensesDialogComponent,
    ContainerWorkEditDialogComponent,
  ],
  providers: [
    BaseSettingsService,
    ScrollService,
    BaseCellManipulationService,
    BaseCellRenderService,
    BaseCreateCellService,
    BaseCreateHeaderService,
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    BaseDrawScheduleService,
    BaseCanvasManagerService,
    BaseGridRenderService,
    CellIconsService,
    ContextMenuService,
    ProgressBarAnimationService,
    ScheduleContextMenuService,
    ScheduleEntryActionsService,
    ScheduleDialogService,
    ScheduleDragDropService,
    ScheduleNavigationService,
    ScheduleBreakBarRenderService,
    ScheduleSectionFacadeService,
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSectionComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @ViewChild('scheduleHScrollbar', { static: true })
  scheduleHScrollbar!: HScrollbarComponent;
  @ViewChild('scheduleSurface', { static: true })
  scheduleSurface!: GridSurfaceTemplateComponent;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;
  @ViewChild(CorrectionDialogComponent)
  correctionDialog!: CorrectionDialogComponent;
  @ViewChild(ReplacementDialogComponent)
  replacementDialog!: ReplacementDialogComponent;
  @ViewChild(WorkEditDialogComponent)
  workEditDialog!: WorkEditDialogComponent;
  @ViewChild(ExpensesDialogComponent)
  expensesDialog!: ExpensesDialogComponent;
  @ViewChild(ContainerWorkEditDialogComponent)
  containerWorkEditDialog!: ContainerWorkEditDialogComponent;

  horizontalSize = input(200);
  zoom = input(1.0);
  refreshTrigger = input(false);

  horizontalSizeChange = output<number>();
  hScrollPositionChange = output<number>();

  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  direction = inject(DirectionService).direction;

  protected dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private facade = inject(ScheduleSectionFacadeService);
  private cdr = inject(ChangeDetectorRef);

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;
  private tooltipState: TooltipState = { lastHeaderColumn: -1 };
  private contextMenuRow = -1;
  private contextMenuColumn = -1;
  private contextMenuBreakPlaceholder: IBreakPlaceholder | null = null;

  private destroy$ = new Subject<void>();
  private effects: EffectRef[] = [];
  private initialSyncDone = true;

  ngOnInit(): void {
    this.facade.tooltip.initLanguage();
    this.settings.editable = true;
    this.facade.absenceMenu.loadIfNeeded();
  }

  ngAfterViewInit() {
    this.readSignals();
    this.applyGlobalGroupSelection();
    this.dataManagement.readDatas();
    this.scheduleSurface.drawSchedule.showFillHandle = true;
    this.facade.dialog.setDialogs(this.correctionDialog, this.replacementDialog, this.workEditDialog, this.expensesDialog, this.containerWorkEditDialog);
    this.facade.gridRender.overlayRenderer = (ctx) => this.facade.breakBarRender.renderBreakBars(ctx);

    this.splitEl.dragProgress$.pipe(takeUntil(this.destroy$)).subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize + 5);
    });

    this.scheduleHScrollbar.valueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.hScrollService.setPosition(value);
        this.hScrollPositionChange.emit(value);
      });

    this.scheduleHScrollbar.maxValueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.hScrollService.setMaxValue(value);
      });

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.destroy$))
      .subscribe((keys) => {
        this.menuClicked(keys);
      });
  }

  private applyGlobalGroupSelection(): void {
    const globalGroupId = this.facade.groupSelection.selectedGroupId;
    if (globalGroupId !== undefined) {
      this.dataManagement.workFilter.selectedGroup = globalGroupId;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.facade.gridRender.overlayRenderer = undefined;

    this.effects.forEach((e) => e?.destroy());
    this.effects = [];
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-schedule-section'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-scrollbar-size',
        `${this.vScrollbarSize}px`
      );
      hostElement.style.setProperty(
        '--h-scrollbar-size',
        `${this.hScrollbarSize}px`
      );
    }
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const dataReadEffect = effect(() => {
        const readState = this.dataManagement.isRead();
        if (readState.count > 0) {
          this.scheduleSurface.Refresh(readState.resetScroll);
        }
      });
      this.effects.push(dataReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
        this.cdr.markForCheck();
      });
      this.effects.push(vScrollbarSizeEffect);

      const hScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedCols();
        this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
        this.updateScrollbarSizes();
        this.cdr.markForCheck();
      });
      this.effects.push(hScrollbarSizeEffect);

      const hScrollPositionEffect = effect(() => {
        const position = this.hScrollService.horizontalPosition();
        if (this.initialSyncDone && this.hScrollbar.value !== position) {
          this.hScrollbar.value = position;
          this.scrollService.horizontalScrollPosition = position;
          this.cdr.markForCheck();
        }
      });
      this.effects.push(hScrollPositionEffect);

      const hoveredCellEffect = effect(() => {
        const hoveredCell = this.cellManipulation.hoveredCell();
        this.facade.tooltip.handleHoveredCell(
          hoveredCell,
          this.scheduleSurface.dataService,
          this.scheduleSurface,
          this.tooltipState,
          true
        );
      });
      this.effects.push(hoveredCellEffect);

      const scheduleUpdateEffect = effect(() => {
        const updateId = this.facade.workNotification.scheduleUpdateSignal();
        if (updateId) {
          this.scheduleSurface.Refresh(false);
        }
      });
      this.effects.push(scheduleUpdateEffect);

      const showInScheduleEffect = effect(() => {
        const request = this.facade.showInSchedule.request();
        if (request) {
          if (request.clientId && request.date) {
            this.scrollToClient(request.clientId, request.date);
          } else if (request.shiftId !== undefined && request.column !== undefined) {
            this.scrollToScheduleEntry(request.shiftId, request.column);
          }
          this.facade.showInSchedule.clear();
        }
      });
      this.effects.push(showInScheduleEffect);

      const periodHoursEffect = effect(() => {
        const _timestamp = this.facade.workScheduleLoader.periodHoursUpdated();

        if (this.scheduleSurface) {
          this.scheduleSurface.Refresh(false);
        }
      });
      this.effects.push(periodHoursEffect);

      const colorResetEffect = effect(() => {
        if (this.facade.gridColor.isReset()) {
          this.scheduleSurface.Refresh(false);
        }
      });
      this.effects.push(colorResetEffect);

      let zoomInitialized = false;
      const zoomEffect = effect(() => {
        const zoomValue = this.zoom();
        if (zoomInitialized) {
          this.settings.zoom = zoomValue;
        }
        zoomInitialized = true;
      });
      this.effects.push(zoomEffect);

      let refreshInitialized = false;
      const refreshTriggerEffect = effect(() => {
        const _trigger = this.refreshTrigger();
        if (refreshInitialized) {
          this.scheduleSurface.Refresh();
        }
        refreshInitialized = true;
      });
      this.effects.push(refreshTriggerEffect);

    });
  }

  onVisibleValueHScrollbarChange(value: number): void {
    this.hScrollbar.visibleValue = value;
    this.hScrollService.setVisibleValue(value);
  }

  getDropTargetInfo(
    mouseY: number,
    column: number
  ): { row: number; clientId: string; date: Date; isEmpty: boolean } | null {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    return this.facade.dragDrop.getDropTargetInfo(mouseY, column, dataService);
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.facade.dragDrop.handleShiftDrop(result);
  }

  onCellValueChange(event: CellValueChangeEvent): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.dragDrop.handleCellValueChange(event, dataService);
  }

  onRightClick(event: GridSurfaceRightClickEvent): void {
    console.log('[SCHEDULE-CTX] onRightClick called', { row: event.row, column: event.column });
    if (!this.contextMenu) {
      console.log('[SCHEDULE-CTX] contextMenu is null/undefined!');
      return;
    }

    this.contextMenu.closeMenu(true);

    const bp = this.facade.breakBarRender.getBreakPlaceholderAt(event.row, event.column);
    if (bp) {
      this.contextMenuBreakPlaceholder = bp;
      this.contextMenu.menuData = this.facade.contextMenu.createBreakPlaceholderContextMenu(bp);
    } else {
      this.contextMenuBreakPlaceholder = null;
      this.createContextMenu(event.row, event.column);
    }

    console.log('[SCHEDULE-CTX] menuData items:', this.contextMenu.menuData?.list?.length);
    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private createContextMenu(row: number, column: number): void {
    this.contextMenuRow = row;
    this.contextMenuColumn = column;
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.contextMenu.menuData = this.facade.contextMenu.createContextMenu({
      row,
      column,
      dataService,
    });
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;

    switch (keys[0]) {
      case 'showInShift':
        this.contextMenu.closeMenu(true);
        this.showSelectedShiftInShiftSection();
        break;
      case 'copy':
        this.contextMenu.closeMenu(true);
        this.cellManipulation.copy();
        break;
      case 'cut':
        this.contextMenu.closeMenu(true);
        this.cellManipulation.copy();
        this.facade.entryActions.deleteSelectedEntries(dataService);
        break;
      case 'paste':
        this.contextMenu.closeMenu(true);
        this.cellManipulation.paste();
        break;
      case 'del':
        this.contextMenu.closeMenu(true);
        this.facade.entryActions.deleteSelectedEntries(dataService);
        break;
      case 'shift':
        this.contextMenu.closeMenu(true);
        this.facade.entryActions.addWorkFromShiftMenu(keys[1], this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'absence':
        this.contextMenu.closeMenu(true);
        this.facade.entryActions.addBreakFromAbsenceMenu(keys[1], this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'correction':
        this.contextMenu.closeMenu(true);
        this.facade.dialog.openCorrectionDialog(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'replacement':
        this.contextMenu.closeMenu(true);
        this.facade.dialog.openReplacementDialog(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'edit': {
        this.contextMenu.closeMenu(true);
        const editEntry = dataService.getWorkScheduleEntryForCell(this.contextMenuRow, this.contextMenuColumn);
        if (editEntry?.entryType === WorkScheduleEntryType.ScheduleNote || editEntry?.entryType === WorkScheduleEntryType.ScheduleCommand) {
          this.cellManipulation.startEditing();
        } else {
          this.facade.dialog.editWorkChange(this.contextMenuRow, this.contextMenuColumn, dataService);
        }
        break;
      }
      case 'editWork':
        this.contextMenu.closeMenu(true);
        this.facade.dialog.openWorkEditDialog(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'openContainer':
        this.contextMenu.closeMenu(true);
        this.onContainerWorkDoubleClick({ row: this.contextMenuRow, column: this.contextMenuColumn });
        break;
      case 'expenses':
        this.contextMenu.closeMenu(true);
        this.facade.dialog.openExpensesDialog(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'confirm':
        this.contextMenu.closeMenu(true);
        this.facade.entryActions.confirmWork(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'unconfirm':
        this.contextMenu.closeMenu(true);
        this.facade.entryActions.unconfirmWork(this.contextMenuRow, this.contextMenuColumn, dataService);
        break;
      case 'deleteBreakPlaceholder':
        this.contextMenu.closeMenu(true);
        this.deleteBreakPlaceholder();
        break;
      case 'adoptAbsence':
        this.contextMenu.closeMenu(true);
        this.adoptBreakPlaceholder(keys[1]);
        break;
    }
  }

  private showSelectedShiftInShiftSection(): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.navigation.showSelectedShiftInShiftSection(dataService);
  }

  private scrollToClient(clientId: string, date: string): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.navigation.scrollToClient(
      clientId,
      date,
      dataService,
      this.scheduleSurface.drawSchedule.height,
      this.vScrollbar,
      this.hScrollbar,
      () => this.scheduleSurface.drawSchedule.redraw()
    );
  }

  private scrollToScheduleEntry(shiftId: string, column: number): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.navigation.scrollToScheduleEntry(
      shiftId,
      column,
      dataService,
      this.scheduleSurface.drawSchedule.height,
      this.vScrollbar,
      () => this.scheduleSurface.drawSchedule.redraw()
    );
  }

  onWorkChangeDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.dialog.editWorkChange(event.row, event.column, dataService);
  }

  private deleteBreakPlaceholder(): void {
    if (!this.contextMenuBreakPlaceholder?.id) return;

    const id = this.contextMenuBreakPlaceholder.id;
    this.facade.dataBreakPlaceholder.deleteBreak(id).subscribe({
      next: () => {
        this.facade.breakPlaceholderLoader.removeBreakPlaceholder(id);
        this.facade.workScheduleLoader.applyBreakPlaceholderRows();
        this.dataManagement.isRead.update(v => ({ count: v.count + 1, resetScroll: false }));
      },
    });
  }

  private adoptBreakPlaceholder(absenceItemId?: string): void {
    if (!this.contextMenuBreakPlaceholder) return;
    const bp = this.contextMenuBreakPlaceholder;

    this.facade.entryActions.adoptBreakPlaceholder(bp, absenceItemId).then(() => {
      if (!bp.id) return;
      this.facade.dataBreakPlaceholder.deleteBreak(bp.id).subscribe({
        next: () => {
          this.facade.breakPlaceholderLoader.removeBreakPlaceholder(bp.id!);
          this.facade.workScheduleLoader.applyBreakPlaceholderRows();
          this.dataManagement.isRead.update(v => ({ count: v.count + 1, resetScroll: false }));
        },
      });
    });
  }

  onWorkDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    this.facade.dialog.openWorkEditDialog(event.row, event.column, dataService);
  }

  onContainerWorkDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    const clickedDate = dataService.getDateForColumn(event.column);
    const availableShifts = this.mapShiftsToAvailable(
      this.dataManagement.shiftSchedules,
      clickedDate,
    );
    this.facade.dialog.openContainerWorkEditDialog(event.row, event.column, dataService, availableShifts);
  }

  private mapShiftsToAvailable(shifts: IShiftSchedule[], targetDate: Date | undefined): AvailableShift[] {
    return shifts
      .filter(s => this.isShiftSelectableForContainer(s, targetDate))
      .map(s => ({
        id: s.shiftId,
        name: s.shiftName,
        abbreviation: s.abbreviation,
        startShift: s.startShift,
        endShift: s.endShift,
        workTime: s.workTime,
        clientId: '',
        isTimeRange: s.isTimeRange,
        isSporadic: s.isSporadic,
      }));
  }

  private isShiftSelectableForContainer(shift: IShiftSchedule, targetDate: Date | undefined): boolean {
    if (shift.shiftType === 1) return false;
    if (shift.isInTemplateContainer) return false;
    if (shift.engaged >= shift.sumEmployees * shift.quantity) return false;
    if (targetDate && !this.isSameDay(shift.date, targetDate)) return false;
    return true;
  }

  private isSameDay(a: Date | string, b: Date): boolean {
    const da = a instanceof Date ? a : new Date(a);
    return (
      da.getFullYear() === b.getFullYear() &&
      da.getMonth() === b.getMonth() &&
      da.getDate() === b.getDate()
    );
  }
}
