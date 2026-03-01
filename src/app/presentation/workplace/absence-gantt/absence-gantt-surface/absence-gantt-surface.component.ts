// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  compareDate,
  addDays,
  daysBetweenDates,
} from 'src/app/shared/helpers/date.helper';
import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { CalendarSettingService } from 'src/app/presentation/workplace/absence-gantt/services/calendar-setting.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { HolidayDate } from 'src/app/domain/models/calendar/calendar-rule-class';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { TranslateService } from '@ngx-translate/core';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { AbsenceGanttDragDropService } from '../services/absence-gantt-drag-drop.service';
import { AbsenceGanttContextMenuService } from '../services/absence-gantt-context-menu.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { AbsenceCalendarDirective } from '../directives/absence-calendar.directive';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { ContextMenuService } from 'src/app/presentation/shared/context-menu/context-menu.service';
import { SelectedArea } from 'src/app/presentation/shared/grid/enums/breaks_enums';
import { TooltipService } from 'src/app/presentation/shared/tooltip/tooltip.service';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { Language } from 'src/app/domain/models/settings/language-config';

@Component({
  selector: 'app-absence-gantt-surface',
  templateUrl: './absence-gantt-surface.component.html',
  styleUrls: ['./absence-gantt-surface.component.scss'],
  standalone: true,
  imports: [ResizeDirective, AbsenceCalendarDirective, ContextMenuComponent],
  providers: [ScrollbarService, ContextMenuService],
})
export class AbsenceGanttSurfaceComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;
  @Input() absenceMask: AbsenceGanttMaskComponent | undefined;
  @Input() absenceRowHeader: AbsenceGanttRowHeaderComponent | undefined;
  @Input() valueChangeHScrollbar!: number;
  @Input() valueChangeVScrollbar!: number;

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();

  @ViewChild('boxCalendar') boxCalendar!: ElementRef<HTMLCanvasElement>;

  public calendarSetting = inject(CalendarSettingService);
  public holidayCollection = inject(HolidayCollectionService);
  public dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  public drawRowHeader = inject(DrawRowHeaderService);
  public scroll = inject(ScrollService);
  public drawCalendarGantt = inject(DrawCalendarGanttService);
  private renderer = inject(Renderer2);
  private translateService = inject(TranslateService);
  private el = inject(ElementRef);
  private cd = inject(ChangeDetectorRef);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private tooltipService = inject(TooltipService);
  private dragDropService = inject(AbsenceGanttDragDropService);
  private contextMenuService = inject(AbsenceGanttContextMenuService);

  public isShift = false;
  public isCtrl = false;

  private isAbsenceHeaderInit = false;
  private eventListeners = new Array<() => void>();

  /* #region dom */
  setBodyCursorStyle(cursorStyle: string): void {
    const bodyElem = this.renderer.selectRootElement('body');
    this.renderer.setStyle(bodyElem, 'cursor', cursorStyle);
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
    this.readSignals();

    this.drawCalendarGantt.pixelRatio = DrawHelper.pixelRatio();

    this.absenceMask?.UpdateEvent.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.onUpdateMask();
    });
  }

  ngAfterViewInit(): void {
    this.initializeDrawCalendarGantt();
    this.contextMenuService.setContextMenu(this.contextMenu);

    this.calendarSetting.zoomChangingEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.drawCalendarGantt.resetAll();
        this.setAllScrollValues();
      });

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.drawCalendarGantt.createRuler();
        this.drawCalendarGantt.drawCalendar();
      });

    this.contextMenu?.hasClicked
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x) => {
        this.contextMenuService.menuClicked(x);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    let vDirection = false;
    let hDirection = false;

    if (changes['valueChangeHScrollbar']) {
      this.scroll.horizontalScrollPosition = this.valueChangeHScrollbar;
      hDirection = true;
    }

    if (changes['valueChangeVScrollbar']) {
      const requestedPosition = this.valueChangeVScrollbar;
      const loadedRows = this.dataManagementBreak.rows;
      const totalRows = this.dataManagementBreak.totalAvailableRows;

      if (totalRows > 0 && loadedRows < totalRows) {
        const maxAllowedPosition = Math.max(
          0,
          loadedRows - this.scroll.visibleRows,
        );
        this.scroll.verticalScrollPosition = Math.min(
          requestedPosition,
          maxAllowedPosition,
        );

        if (requestedPosition > maxAllowedPosition) {
          this.valueVScrollbar.emit(this.scroll.verticalScrollPosition);

          if (!this.dataManagementBreak.isLoadingMore) {
            this.dataManagementBreak.loadMoreRows();
          }
        }
      } else {
        this.scroll.verticalScrollPosition = requestedPosition;
      }
      vDirection = true;
    }

    if (vDirection || hDirection) {
      this.drawCalendarGantt.moveCalendar(hDirection, vDirection);
    }
  }

  ngOnDestroy(): void {
    this.eventListeners.forEach((fn) => fn());
    this.eventListeners = [];

    this.drawCalendarGantt.deleteCanvas();
  }

  /* #endregion ng */

  /* #region   resize+visibility */

  setFocus(): void {
    const x = this.el.nativeElement as HTMLDivElement;
    if (x) {
      x.focus();
      this.drawCalendarGantt.isFocused = true;
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.updateDrawCalendarGanttDimensions(entry.target as HTMLElement);
          this.checkPixelRatio();
          this.redrawComponents();
        });
      });
    }
  }

  private updateDrawCalendarGanttDimensions(element: HTMLElement): void {
    if (!this.drawCalendarGantt.isCanvasAvailable()) {
      return;
    }

    this.drawCalendarGantt.height = element.clientHeight;
    this.drawCalendarGantt.width = element.clientWidth;

    this.setAllScrollValues();
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGantt.pixelRatio !== pixelRatio) {
      this.drawCalendarGantt.deleteCanvas();
      this.drawCalendarGantt.createCanvas();
      this.drawCalendarGantt.pixelRatio = pixelRatio;
    }
  }

  private redrawComponents(): void {
    this.drawCalendarGantt.createRuler();
    this.drawCalendarGantt.renderCalendar();
    this.drawCalendarGantt.drawCalendar();
  }

  private initializeDrawCalendarGantt(): void {
    const box = this.boxCalendar.nativeElement;
    this.drawCalendarGantt.height = box.clientHeight;
    this.drawCalendarGantt.width = box.clientWidth;
    this.drawCalendarGantt.createCanvas();
  }

  /* #endregion   resize+visibility */

  /* #region   select */

  onMouseDown(event: MouseEvent): void {
    this.dragDropService.onMouseDown(event);
  }

  onMouseUp(event: MouseEvent): void {
    this.dragDropService.onMouseUp(event);
  }

  onMouseMove(event: MouseEvent): void {
    this.dragDropService.onMouseMove(event);
  }

  isMouseOverSelectedBreak(event: MouseEvent): boolean {
    return this.dragDropService.isMouseOverSelectedBreak(event);
  }

  onSelectByMouse(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    const dy = y - this.calendarSetting.cellHeaderHeight;
    const height = this.calendarSetting.cellHeight;

    if (dy >= 0) {
      const tmpRow = Math.floor(dy / height);
      const tmpSelectedRow = tmpRow + this.drawCalendarGantt.firstVisibleRow;

      if (this.drawCalendarGantt.selectedRow !== tmpSelectedRow) {
        this.drawCalendarGantt.selectedRow = tmpSelectedRow;
        this.dragDropService.selectedArea = SelectedArea.None;

        this.drawCalendarGantt.unDrawSelectionRow();
        this.drawCalendarGantt.drawSelectionRow();
      }

      this.dragDropService.existActiveSelection(event);
      if (
        this.dragDropService.selectedArea === SelectedArea.LeftAnchor ||
        this.dragDropService.selectedArea === SelectedArea.RightAnchor
      ) {
        return;
      }

      this.dragDropService.createBreakSelection(tmpSelectedRow, x);
      this.drawCalendarGantt.drawSelectedBreak();
    }
  }

  selectBreakById(breakPlaceholderId: string): void {
    for (let row = 0; row < this.dataManagementBreak.rows; row++) {
      const breaks = this.dataManagementBreak.readData(row);
      if (breaks) {
        const breakIndex = breaks.findIndex((b) => b.id === breakPlaceholderId);
        if (breakIndex !== -1) {
          this.drawCalendarGantt.selectedRow = row;
          this.drawCalendarGantt.selectedBreakIndex = breakIndex;
          this.dragDropService.selectedArea = SelectedArea.AbsenceBar;

          this.drawCalendarGantt.unDrawSelectionRow();
          this.drawCalendarGantt.drawSelectionRow();
          this.drawCalendarGantt.drawSelectedBreak();

          if (this.absenceMask) {
            this.absenceMask.onBreakChange(breakIndex);
          }

          break;
        }
      }
    }
  }

  /* #endregion   select */

  /* #region position and selection */

  holidayInfo(column: number): HolidayDate | undefined {
    const today = addDays(this.drawCalendarGantt.startDate, column);
    this.ensureCorrectYearLoaded(today);
    return this.holidayCollection.holidays.holidayList.find((x) =>
      compareDate(x.currentDate, today),
    );
  }

  private ensureCorrectYearLoaded(date: Date): void {
    const year = date.getFullYear();
    const currentYear = this.holidayCollection.currentYear;

    if (year < currentYear - 1 || year > currentYear + 1) {
      this.holidayCollection.currentYear = year;
    }
  }
  setShiftKey(): void {
    if (!this.isShift) {
      this.isShift = true;
      // this.AnchorKeyPosition = this.position;
    }
  }

  unSetShiftKey(): void {
    this.isShift = false;
    // this.AnchorKeyPosition = undefined;
  }

  calcCorrectCoordinate(event: MouseEvent) {
    return this.drawCalendarGantt.calcCorrectCoordinate(event);
  }

  /* #endregion position and selection */

  /* #region ToolTips */

  showToolTip(value: MultiLanguage, event: MouseEvent): void {
    const lang = this.translateService.currentLang as Language;
    const name = getLocalizedValue(value, lang);

    this.tooltipService.show({
      text: name,
      x: event.clientX,
      y: event.clientY,
    });
  }

  hideToolTip() {
    this.tooltipService.hide();
  }

  destroyToolTip() {
    this.tooltipService.hide();
  }
  /* #endregion ToolTips */

  /* #region   drag-drop */

  dragOver(event: DragEvent): void {
    this.dragDropService.dragOver(event);
  }

  drop(event: DragEvent): void {
    this.dragDropService.drop(event);
  }

  /* #endregion   drag-drop */

  /* #region   show Entry */

  onChangeIndex(index: number): void {
    this.drawCalendarGantt.selectedBreakIndex = index - 1;
    this.drawCalendarGantt.drawSelectedBreak();
    this.showSelectedBreak();
  }

  showSelectedBreak() {
    const data = this.dataManagementBreak.readData(
      this.drawCalendarGantt.selectedRow,
    );
    if (
      !data ||
      this.drawCalendarGantt.selectedBreakIndex < 0 ||
      this.drawCalendarGantt.selectedBreakIndex >= data.length
    ) {
      return;
    }
    const tmpBreak = data[this.drawCalendarGantt.selectedBreakIndex];
    if (tmpBreak) {
      const col1 = Math.floor(
        daysBetweenDates(this.drawCalendarGantt.startDate, tmpBreak.from!),
      );
      const col2 = Math.floor(
        daysBetweenDates(this.drawCalendarGantt.startDate, tmpBreak.until!),
      );

      if (this.drawCalendarGantt.firstVisibleColumn() > col1) {
        const m = col1;

        this.scroll.horizontalScrollPosition = m;
        this.valueHScrollbar.emit(m);
        this.drawCalendarGantt.drawCalendar();
      } else if (this.drawCalendarGantt.lastVisibleColumn() < col2) {
        const m = col2 - this.drawCalendarGantt.visibleCol() + 2;
        this.valueHScrollbar.emit(m);
        this.scroll.horizontalScrollPosition = m;
        this.drawCalendarGantt.drawCalendar();
      }
    }
  }

  onUpdateMask() {
    this.drawCalendarGantt.unDrawSelectionRow();
    this.drawCalendarGantt.drawSelectionRow();
    this.drawCalendarGantt.drawSelectedBreak();
    this.showSelectedBreak();
  }
  /* #endregion   show Entry */

  /* #region   context Menu */

  createContextMenu(event: MouseEvent): void {
    const isOver = this.dragDropService.isMouseOverSelectedBreak(event);
    this.contextMenuService.createContextMenu(event, isOver);
  }

  menuClose(): void {
    this.contextMenuService.menuClose();
  }

  /* #endregion   context Menu */

  /* #region   CRUD */

  public Delete(): void {
    this.contextMenuService.deleteBreak();
  }

  /* #endregion   CRUD */

  /* #region CopyCutPaste */

  public copy(): void {
    this.contextMenuService.copy();
  }

  public async paste(): Promise<void> {
    return this.contextMenuService.paste();
  }

  public cut(): void {
    this.contextMenuService.cut();
  }

  /* #endregion CopyCutPaste */

  /* #region Scroll */
  private setAllScrollValues(): void {
    this.setRowsScrollValues();
    this.setColumnsScrollValues();
  }

  private setColumnsScrollValues(): void {
    this.scroll.maxCols = this.drawCalendarGantt.columns;
    this.scroll.visibleCols = this.drawCalendarGantt.visibleCol();
    this.maxValueHScrollbar.emit(this.drawCalendarGantt.columns);
    this.visibleValueHScrollbar.emit(this.drawCalendarGantt.visibleCol());
  }

  private setRowsScrollValues(): void {
    const totalRows =
      this.dataManagementBreak.totalAvailableRows > 0
        ? this.dataManagementBreak.totalAvailableRows
        : this.dataManagementBreak.rows;

    this.scroll.maxRows = totalRows;
    this.scroll.visibleRows = this.drawCalendarGantt.visibleRow();
    this.maxValueVScrollbar.emit(totalRows);
    this.visibleValueVScrollbar.emit(this.drawCalendarGantt.visibleRow());
  }

  /* #endregion Scroll */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.dataManagementBreak.isRead()) {
          this.setAllScrollValues();
          this.drawCalendarGantt.setMetrics();
          this.drawCalendarGantt.checkSelectedRowVisibility();
          this.drawCalendarGantt.renderCalendar();
          this.drawCalendarGantt.drawCalendar();
        }
      });

      effect(() => {
        if (this.holidayCollection.isReset()) {
          this.drawCalendarGantt.selectedRow = -1;
          this.drawCalendarGantt.updateStartDate =
            this.holidayCollection.currentYear;
          this.drawCalendarGantt.resetAll();
        }
      });

      effect(() => {
        const isUpdate = this.dataManagementBreak.isUpdate();
        if (isUpdate) {
          this.drawCalendarGantt.selectedBreakIndex =
            this.dataManagementBreak.indexOfBreak(isUpdate);

          this.onUpdateMask();
          this.cd.detectChanges();
        }
      });

      effect(() => {
        this.isAbsenceHeaderInit =
          this.dataManagementBreak.isAbsenceHeaderInit();
        if (this.isAbsenceHeaderInit) {
          this.drawCalendarGantt.selectedRow = -1;
          this.drawCalendarGantt.updateStartDate =
            this.holidayCollection.currentYear;
          this.drawCalendarGantt.resetAll();
          this.dataManagementBreak.canReadBreaks = true;
          this.dataManagementBreak.readYear();
          this.cd.detectChanges();
        }
      });
    });
  }
}
