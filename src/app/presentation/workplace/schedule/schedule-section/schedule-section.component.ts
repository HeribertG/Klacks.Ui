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
  ElementRef,
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
  viewChild,
  computed,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from './schedule-schedule-row-header/schedule-schedule-row-header.component';
import { ScheduleTimelineRowHeaderComponent } from './timeline/schedule-timeline-row-header/schedule-timeline-row-header.component';
import { GridSurfaceTimelineTemplateComponent } from './timeline/grid-surface-timeline-template/grid-surface-timeline-template.component';
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
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
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
import {
  ScheduleMenuDispatcherService,
  ScheduleMenuHost,
} from './services/schedule-menu-dispatcher.service';
import { ScheduleNavigationService } from './services/schedule-navigation.service';
import { GridDoubleClickEvent } from 'src/app/presentation/shared/grid/body/directives/grid-template-events.directive';
import { ScheduleBreakBarRenderService } from './services/schedule-break-bar-render.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { ScheduleSectionFacadeService } from './services/schedule-section-facade.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { TimelineSelectionService } from './timeline/services/timeline-selection.service';

type ActiveSurface = GridSurfaceTemplateComponent | GridSurfaceTimelineTemplateComponent;

@Component({
  selector: 'app-schedule-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleScheduleRowHeaderComponent,
    ScheduleTimelineRowHeaderComponent,
    GridSurfaceTimelineTemplateComponent,
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
    ScheduleMenuDispatcherService,
    ScheduleNavigationService,
    ScheduleBreakBarRenderService,
    ScheduleSectionFacadeService,
    TimelineSelectionService,
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSectionComponent
  implements OnInit, AfterViewInit, OnDestroy, ScheduleMenuHost
{
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @ViewChild('scheduleHScrollbar', { static: true })
  scheduleHScrollbar!: HScrollbarComponent;
  @ViewChild('scheduleBox', { static: true })
  scheduleBox!: ElementRef<HTMLElement>;
  scheduleSurface = viewChild<GridSurfaceTemplateComponent>('scheduleSurface');
  timelineSurface = viewChild<GridSurfaceTimelineTemplateComponent>('timelineSurface');
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

  private viewModeService = inject(ScheduleViewModeService);
  public viewMode = this.viewModeService.viewMode;

  direction = inject(DirectionService).direction;

  protected dataManagement = inject(DataManagementScheduleService);
  public dataService = inject(BaseDataService);
  private scrollService = inject(ScrollService);
  private hostElement = inject(ElementRef<HTMLElement>);

  private get scheduleService(): ScheduleDataService {
    return this.dataService as ScheduleDataService;
  }
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private facade = inject(ScheduleSectionFacadeService);
  private menuDispatcher = inject(ScheduleMenuDispatcherService);
  private cdr = inject(ChangeDetectorRef);

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;
  private tooltipState: TooltipState = { lastHeaderColumn: -1 };
  public contextMenuRow = -1;
  public contextMenuColumn = -1;
  public contextMenuEntry: IScheduleCell | null | undefined = undefined;
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
    const tableSurface = this.scheduleSurface();
    if (tableSurface) {
      tableSurface.drawSchedule.showFillHandle = true;
    }
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
      this.wireDataReadEffect();
      this.wireScrollbarEffects();
      this.wireHScrollPositionEffect();
      this.wireHoveredCellEffect();
      this.wireScheduleUpdateEffect();
      this.wireShowInScheduleEffect();
      this.wirePeriodHoursEffect();
      this.wireColorResetEffect();
      this.wireZoomEffect();
      this.wireRefreshTriggerEffect();
    });
  }

  private currentSurface = computed<ActiveSurface | undefined>(() =>
    this.viewMode() === 'table' ? this.scheduleSurface() : this.timelineSurface(),
  );

  private withSurface(action: (surface: ActiveSurface) => void): void {
    const surface = this.currentSurface();
    if (surface) {
      action(surface);
    }
  }

  private lastReadCount = 0;

  private wireDataReadEffect(): void {
    this.effects.push(effect(() => {
      const readState = this.dataManagement.isRead();
      if (readState.count === 0) return;

      const isNewRead = readState.count > this.lastReadCount;
      this.lastReadCount = readState.count;

      const resetScroll = isNewRead && readState.resetScroll && !this.settings.isTimelineMode;
      this.withSurface((surface) => surface.Refresh(resetScroll));
    }));
  }

  private wireScrollbarEffects(): void {
    this.effects.push(effect(() => {
      const isLocked = this.scrollService.lockedRows();
      this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
      this.updateScrollbarSizes();
      this.cdr.markForCheck();
    }));

    this.effects.push(effect(() => {
      const isLocked = this.scrollService.lockedCols();
      this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
      this.updateScrollbarSizes();
      this.cdr.markForCheck();
    }));
  }

  private wireHScrollPositionEffect(): void {
    this.effects.push(effect(() => {
      const position = this.hScrollService.horizontalPosition();
      if (!this.initialSyncDone || this.hScrollbar.value === position) return;

      this.hScrollbar.value = position;
      this.scrollService.horizontalScrollPosition = position;
      this.cdr.markForCheck();
    }));
  }

  private wireHoveredCellEffect(): void {
    this.effects.push(effect(() => {
      const hoveredCell = this.cellManipulation.hoveredCell();
      const surface = this.currentSurface();
      if (!surface) return;
      this.facade.tooltip.handleHoveredCell(
        hoveredCell,
        this.scheduleService,
        surface,
        this.tooltipState,
        true,
        this.settings.isTimelineMode,
      );
    }));
  }

  private wireScheduleUpdateEffect(): void {
    this.effects.push(effect(() => {
      const updateId = this.facade.workNotification.scheduleUpdateSignal();
      if (updateId) {
        this.withSurface((surface) => surface.Refresh(false));
      }
    }));
  }

  private wireShowInScheduleEffect(): void {
    this.effects.push(effect(() => {
      const request = this.facade.showInSchedule.request();
      if (!request) return;

      if (request.clientId && request.date)
        this.scrollToClient(request.clientId, request.date);
      else if (request.shiftId !== undefined && request.column !== undefined)
        this.scrollToScheduleEntry(request.shiftId, request.column);

      this.facade.showInSchedule.clear();
    }));
  }

  private wirePeriodHoursEffect(): void {
    this.effects.push(effect(() => {
      void this.facade.workScheduleLoader.periodHoursUpdated();
      this.withSurface((surface) => surface.Refresh(false));
    }));
  }

  private wireColorResetEffect(): void {
    this.effects.push(effect(() => {
      if (this.facade.gridColor.isReset()) {
        this.withSurface((surface) => surface.Refresh(false));
      }
    }));
  }

  private wireZoomEffect(): void {
    let initialized = false;
    this.effects.push(effect(() => {
      const zoomValue = this.zoom();
      if (initialized)
        this.settings.zoom = zoomValue;
      initialized = true;
    }));
  }

  private wireRefreshTriggerEffect(): void {
    let initialized = false;
    this.effects.push(effect(() => {
      void this.refreshTrigger();
      if (initialized) {
        this.withSurface((surface) => surface.Refresh(false));
      }
      initialized = true;
    }));
  }

  onVisibleValueHScrollbarChange(value: number): void {
    this.hScrollbar.visibleValue = value;
    this.hScrollService.setVisibleValue(value);
  }

  getDropTargetInfo(
    mouseY: number,
    column: number
  ): { row: number; clientId: string; date: Date; isEmpty: boolean } | null {
    const dataService = this.scheduleService;
    return this.facade.dragDrop.getDropTargetInfo(
      mouseY,
      column,
      dataService,
      this.scheduleBox.nativeElement,
    );
  }

  getHostRect(): DOMRect {
    return this.hostElement.nativeElement.getBoundingClientRect();
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.facade.dragDrop.handleShiftDrop(result);
  }

  onCellValueChange(event: CellValueChangeEvent): void {
    const dataService = this.scheduleService;
    this.facade.dragDrop.handleCellValueChange(event, dataService);
  }

  onRightClick(event: GridSurfaceRightClickEvent): void {
    if (!this.contextMenu) {
      return;
    }

    this.contextMenu.closeMenu(true);

    const bp = this.facade.breakBarRender.getBreakPlaceholderAt(event.row, event.column);
    if (bp) {
      this.contextMenuBreakPlaceholder = bp;
      this.contextMenu.menuData = this.facade.contextMenu.createBreakPlaceholderContextMenu(bp);
    } else {
      this.contextMenuBreakPlaceholder = null;
      this.createContextMenu(event.row, event.column, event.entry);
    }

    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private createContextMenu(
    row: number,
    column: number,
    entry?: IScheduleCell | null,
  ): void {
    this.contextMenuRow = row;
    this.contextMenuColumn = column;
    this.contextMenuEntry = entry;
    const dataService = this.scheduleService;
    this.contextMenu.menuData = this.facade.contextMenu.createContextMenu({
      row,
      column,
      dataService,
      entry,
    });
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;
    this.contextMenu.closeMenu(true);
    this.menuDispatcher.dispatch(keys, this.scheduleService, this);
  }

  openContainerAt(
    row: number,
    column: number,
    entry: IScheduleCell | null | undefined,
  ): void {
    this.onContainerWorkDoubleClick({ row, column, entry: entry ?? undefined });
  }

  showSelectedShiftInShiftSection(): void {
    const dataService = this.scheduleService;
    this.facade.navigation.showSelectedShiftInShiftSection(dataService);
  }

  private scrollToClient(clientId: string, date: string): void {
    const surface = this.currentSurface();
    if (!surface) return;
    const dataService = this.scheduleService;
    this.facade.navigation.scrollToClient(
      clientId,
      date,
      dataService,
      surface.drawSchedule.height,
      this.vScrollbar,
      this.hScrollbar,
      () => surface.drawSchedule.redraw()
    );
  }

  private scrollToScheduleEntry(shiftId: string, column: number): void {
    const surface = this.currentSurface();
    if (!surface) return;
    const dataService = this.scheduleService;
    this.facade.navigation.scrollToScheduleEntry(
      shiftId,
      column,
      dataService,
      surface.drawSchedule.height,
      this.vScrollbar,
      () => surface.drawSchedule.redraw()
    );
  }

  onWorkChangeDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleService;
    this.facade.dialog.editWorkChange(event.row, event.column, dataService, event.entry ?? undefined);
  }

  deleteBreakPlaceholder(): void {
    if (!this.contextMenuBreakPlaceholder?.id) return;

    const id = this.contextMenuBreakPlaceholder.id;
    this.facade.dataBreakPlaceholder.deleteBreak(id).subscribe({
      next: () => {
        this.facade.breakPlaceholderLoader.removeBreakPlaceholder(id);
        this.facade.workScheduleLoader.applyBreakPlaceholderRows();
        this.dataManagement.isRead.update(v => ({ count: v.count + 1, resetScroll: false }));
      },
      error: (err) => console.error('Failed to delete break placeholder', { id, error: err }),
    });
  }

  adoptBreakPlaceholder(absenceItemId?: string): void {
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
        error: (err) => console.error('Failed to delete adopted break placeholder', { id: bp.id, absenceItemId, error: err }),
      });
    }).catch((err) => console.error('Failed to adopt break placeholder', { id: bp.id, absenceItemId, error: err }));
  }

  onWorkDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleService;
    this.facade.dialog.openWorkEditDialog(event.row, event.column, dataService, event.entry ?? undefined);
  }

  onContainerWorkDoubleClick(event: GridDoubleClickEvent): void {
    const dataService = this.scheduleService;
    const clickedDate = dataService.getDateForColumn(event.column);
    const availableShifts = this.mapShiftsToAvailable(
      this.dataManagement.shiftSchedules,
      clickedDate,
    );
    this.facade.dialog.openContainerWorkEditDialog(event.row, event.column, dataService, availableShifts, event.entry ?? undefined);
  }

  onTimelineDeleteBlock(event: GridDoubleClickEvent): void {
    if (!event.entry) return;
    const entry = event.entry;
    if (entry.lockLevel > 0 || entry.isGroupRestricted) return;

    const date = this.scheduleService.getDateForColumn(event.column);
    if (!date) return;

    this.dataManagement.deleteWorkScheduleEntry(
      entry.id,
      entry.sourceId,
      entry.clientId,
      date,
      entry.entryId,
      entry.entryType,
    );
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
