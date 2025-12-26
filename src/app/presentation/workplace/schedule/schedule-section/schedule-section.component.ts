import {
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  EventEmitter,
  Output,
  Input,
  effect,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  EffectRef,
  Injector,
  OnChanges,
  SimpleChanges,
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
import {
  BaseCellManipulationService,
  HoveredCellInfo,
} from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { CellIconsService } from 'src/app/presentation/shared/grid/services/body/cell-icons.service';
import { Subject, takeUntil } from 'rxjs';
import {
  CellValueChangeEvent,
  GridSurfaceRightClickEvent,
  GridSurfaceTemplateComponent,
} from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleHorizontalScrollService } from '../services/schedule-horizontal-scroll.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { TranslateService } from '@ngx-translate/core';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/domain/constants/message-library';
import { ShiftDropResult } from '../services/shift-to-schedule-drag-drop.service';
import { ScheduleDataService } from './services/schedule-data.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';
import { DeleteWorkScheduleEntryParams } from 'src/app/domain/services/schedule/work-schedule-crud.service';
import { ShowInShiftService } from '../services/show-in-shift.service';
import { ShowInScheduleService } from '../services/show-in-schedule.service';

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
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
})
export class ScheduleSectionComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @ViewChild('scheduleHScrollbar', { static: true })
  scheduleHScrollbar!: HScrollbarComponent;
  @ViewChild('scheduleSurface', { static: true })
  scheduleSurface!: GridSurfaceTemplateComponent;
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;

  @Input() horizontalSize = 200;
  @Input() zoom = 1.0;
  @Input() refreshTrigger = false;

  @Output() horizontalSizeChange = new EventEmitter<number>();

  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);
  private injector = inject(Injector);
  private settings = inject(BaseSettingsService);
  private hScrollService = inject(ScheduleHorizontalScrollService);
  private groupSelectionService = inject(GroupSelectionService);
  private cellManipulation = inject(BaseCellManipulationService);
  private translateService = inject(TranslateService);
  private workNotificationService = inject(WorkNotificationService);
  private showInShiftService = inject(ShowInShiftService);
  private showInScheduleService = inject(ShowInScheduleService);

  private currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;
  private lastHeaderColumn = -1;

  private destroy$ = new Subject<void>();
  private effects: EffectRef[] = [];
  private initialSyncDone = true;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.settings.editable = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['zoom'] && !changes['zoom'].firstChange) {
      this.settings.zoom = this.zoom;
    }

    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.scheduleSurface.Refresh();
    }
  }

  ngAfterViewInit() {
    this.readSignals();
    this.applyGlobalGroupSelection();
    this.dataManagement.readDatas();
    this.scheduleSurface.drawSchedule.showFillHandle = true;

    this.splitEl.dragProgress$.pipe(takeUntil(this.destroy$)).subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize + 5);
    });

    this.scheduleHScrollbar.valueChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: number) => {
        this.hScrollService.setPosition(value);
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
    const globalGroupId = this.groupSelectionService.selectedGroupId;
    if (globalGroupId !== undefined) {
      this.dataManagement.workFilter.selectedGroup = globalGroupId;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

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
        if (readState.value) {
          this.scheduleSurface.Refresh(readState.resetScroll);
        }
      });
      this.effects.push(dataReadEffect);

      const vScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedRows();
        this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(vScrollbarSizeEffect);

      const hScrollbarSizeEffect = effect(() => {
        const isLocked = this.scrollService.lockedCols();
        this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
        this.updateScrollbarSizes();
      });
      this.effects.push(hScrollbarSizeEffect);

      const hScrollPositionEffect = effect(() => {
        const position = this.hScrollService.horizontalPosition();
        if (this.initialSyncDone && this.hScrollbar.value !== position) {
          this.hScrollbar.value = position;
          this.scrollService.horizontalScrollPosition = position;
        }
      });
      this.effects.push(hScrollPositionEffect);

      const hoveredCellEffect = effect(() => {
        const hoveredCell = this.cellManipulation.hoveredCell();
        this.handleHoveredCellChange(hoveredCell);
      });
      this.effects.push(hoveredCellEffect);

      const scheduleUpdateEffect = effect(() => {
        const updateId = this.workNotificationService.scheduleUpdateSignal();
        if (updateId) {
          this.scheduleSurface.Refresh(false);
        }
      });
      this.effects.push(scheduleUpdateEffect);

      const showInScheduleEffect = effect(() => {
        const request = this.showInScheduleService.request();
        if (request) {
          this.scrollToScheduleEntry(request.shiftId, request.column);
          this.showInScheduleService.clear();
        }
      });
      this.effects.push(showInScheduleEffect);
    });
  }

  private handleHoveredCellChange(hoveredCell: HoveredCellInfo | null): void {
    if (!hoveredCell) {
      this.lastHeaderColumn = -1;
      this.scheduleSurface.destroyToolTip();
      return;
    }

    if (hoveredCell.isHeader) {
      this.handleHeaderTooltip(hoveredCell);
      return;
    }

    this.lastHeaderColumn = -1;

    if (hoveredCell.isEmpty) {
      const holiday = this.scheduleSurface.dataService.holidayInfo(hoveredCell.column);
      if (holiday?.currentName) {
        const holidayName = this.getTranslatedText(holiday.currentName);
        if (holidayName) {
          this.scheduleSurface.showToolTip({
            value: holidayName,
            event: { clientX: hoveredCell.clientX, clientY: hoveredCell.clientY } as MouseEvent,
          });
          return;
        }
      }
    }

    this.scheduleSurface.destroyToolTip();
  }

  private handleHeaderTooltip(hoveredCell: HoveredCellInfo): void {
    const columnChanged = this.lastHeaderColumn !== hoveredCell.column;
    this.lastHeaderColumn = hoveredCell.column;

    const column = hoveredCell.column;
    const availableShifts = this.dataManagement.availableShiftsByDay;
    const overbookedShifts = this.dataManagement.overbookedShiftsByDay;

    const available = availableShifts?.[column] ?? [];
    const overbooked = overbookedShifts?.[column] ?? [];

    if (available.length === 0 && overbooked.length === 0) {
      this.scheduleSurface.destroyToolTip();
      return;
    }

    if (columnChanged) {
      this.scheduleSurface.destroyToolTip();
    }

    const tooltipText = this.buildHeaderTooltipText(overbooked, available);
    this.scheduleSurface.showToolTip({
      value: tooltipText,
      event: { clientX: hoveredCell.clientX, clientY: hoveredCell.clientY } as MouseEvent,
    });
  }

  private buildHeaderTooltipText(overbooked: readonly string[], available: readonly string[]): string {
    const lines: string[] = [];

    if (overbooked.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.overbooked');
      lines.push(`${label}:<br>${overbooked.join(', ')}`);
    }

    if (overbooked.length > 0 && available.length > 0) {
      lines.push('<br>');
    }

    if (available.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.available');
      lines.push(`${label}:<br>${available.join(', ')}`);
    }

    return lines.join('');
  }

  private getTranslatedText(multiLanguage: MultiLanguage): string {
    return multiLanguage[this.currentLang] || multiLanguage.de || '';
  }

  onVisibleValueHScrollbarChange(value: number): void {
    this.hScrollbar.visibleValue = value;
    this.hScrollService.setVisibleValue(value);
  }

  getDropTargetInfo(
    mouseY: number,
    column: number
  ): { row: number; clientId: string; date: Date; isEmpty: boolean } | null {
    const scheduleElement = document.querySelector('app-schedule-section .box');
    if (!scheduleElement) {
      return null;
    }

    const rect = scheduleElement.getBoundingClientRect();
    const relativeY = mouseY - rect.top - this.settings.cellHeaderHeight;

    if (relativeY < 0) {
      return null;
    }

    const row =
      Math.floor(relativeY / this.settings.cellHeight) +
      this.scrollService.verticalScrollPosition;

    const dataService = this.scheduleSurface.dataService as ScheduleDataService;

    if (row < 0 || row >= dataService.rows) {
      return null;
    }

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return null;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client || !client.id) {
      return null;
    }

    const date = dataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    const isEmpty = !dataService.isCellActive(row, column);

    return {
      row,
      clientId: client.id,
      date,
      isEmpty,
    };
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.dataManagement.addWorkScheduleEntry({
      clientId: result.targetClientId,
      date: result.targetDate,
      shiftId: result.shiftId,
      workTime: result.workTime,
    });
  }

  onCellValueChange(event: CellValueChangeEvent): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;

    const clientIndex = dataService.rowGroupIndex[event.row];
    if (clientIndex === undefined) {
      return;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) {
      return;
    }

    const date = dataService.getDateForColumn(event.column);
    if (!date) {
      return;
    }

    const abbreviation = event.value.trim().toUpperCase();
    if (!abbreviation) {
      return;
    }

    const matchingShift = this.dataManagement.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === abbreviation &&
        this.isSameDay(shift.date, date)
    );

    if (matchingShift) {
      this.dataManagement.addWorkScheduleEntry({
        clientId: client.id,
        date: date,
        shiftId: matchingShift.shiftId,
        workTime: matchingShift.workTime,
      });
    }
  }

  private isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  onRightClick(event: GridSurfaceRightClickEvent): void {
    if (!this.contextMenu) return;

    this.contextMenu.closeMenu();
    this.createContextMenu(event.row, event.column);
    this.contextMenu.openMenu({
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent);
  }

  private createContextMenu(row: number, column: number): void {
    const menuData = new Menu();
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    const isCellFilled = dataService.isCellActive(row, column);

    if (isCellFilled) {
      menuData.list.push(...MenuDataTemplate.copyCutPaste());
      menuData.list.push(...MenuDataTemplate.divider());
      menuData.list.push(...MenuDataTemplate.delete());
      menuData.list.push(...MenuDataTemplate.divider());
      menuData.list.push(...MenuDataTemplate.showInShift());
    } else {
      menuData.list.push(...MenuDataTemplate.paste());
    }

    const pasteMenu = menuData.list.find((x) => x.key === 'paste');
    if (pasteMenu) {
      pasteMenu.disabled = !this.cellManipulation.hasClipboardData();
    }

    this.contextMenu.menuData = menuData;
  }

  private menuClicked(keys: string[]): void {
    if (!keys || keys.length === 0) return;

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
        this.deleteSelectedEntries();
        break;
      case 'paste':
        this.contextMenu.closeMenu(true);
        this.cellManipulation.paste();
        break;
      case 'del':
        this.contextMenu.closeMenu(true);
        this.deleteSelectedEntries();
        break;
    }
  }

  private showSelectedShiftInShiftSection(): void {
    const pos = this.cellManipulation.Position;
    if (pos.isEmpty()) return;

    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    const entry = dataService.getWorkScheduleEntryForCell(pos.row, pos.column);
    if (!entry) return;

    this.showInShiftService.showShift(entry.shiftId, pos.column);
  }

  private deleteSelectedEntries(): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    const positionCollection = this.cellManipulation.PositionCollection;

    if (positionCollection.count() > 1) {
      const entries: DeleteWorkScheduleEntryParams[] = [];

      for (let i = 0; i < positionCollection.count(); i++) {
        const pos = positionCollection.item(i);
        const deleteInfo = this.getDeleteInfoForPosition(dataService, pos.row, pos.column);
        if (deleteInfo) {
          entries.push(deleteInfo);
        }
      }

      if (entries.length > 0) {
        this.dataManagement.bulkDeleteWorkScheduleEntries(entries);
      }
    } else {
      const pos = this.cellManipulation.Position;
      if (pos.isEmpty()) return;

      const deleteInfo = this.getDeleteInfoForPosition(dataService, pos.row, pos.column);
      if (deleteInfo) {
        this.dataManagement.deleteWorkScheduleEntry(
          deleteInfo.workId,
          deleteInfo.clientId,
          deleteInfo.date,
          deleteInfo.shiftId
        );
      }
    }
  }

  private getDeleteInfoForPosition(
    dataService: ScheduleDataService,
    row: number,
    column: number
  ): DeleteWorkScheduleEntryParams | null {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) return null;

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return null;

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) return null;

    const date = dataService.getDateForColumn(column);
    if (!date) return null;

    return {
      workId: entry.workId,
      clientId: client.id,
      date: date,
      shiftId: entry.shiftId,
    };
  }

  private scrollToScheduleEntry(shiftId: string, column: number): void {
    const dataService = this.scheduleSurface.dataService as ScheduleDataService;
    const rowIndex = dataService.findFirstRowByShiftIdAndColumn(shiftId, column);

    if (rowIndex >= 0) {
      const visibleRows = Math.floor(
        (this.scheduleSurface.drawSchedule.height - this.settings.cellHeaderHeight) /
          this.settings.cellHeight
      );
      const targetScroll = Math.max(0, rowIndex - Math.floor(visibleRows / 2));

      this.vScrollbar.value = targetScroll;
      this.scrollService.verticalScrollPosition = targetScroll;
      this.scheduleSurface.drawSchedule.moveGrid();
    }
  }
}
