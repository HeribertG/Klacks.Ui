import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import {
  EqualDate,
  addDays,
  daysBetweenDates,
  equalDate,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';

import { AbsenceGanttHScrollbarComponent } from '../absence-gantt-h-scrollbar/absence-gantt-h-scrollbar.component';
import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { AbsenceGanttVScrollbarComponent } from '../absence-gantt-v-scrollbar/absence-gantt-v-scrollbar.component';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { ScrollService } from 'src/app/workplace/absence-gantt/services/scroll.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { Break, IBreak } from 'src/app/core/break-class';
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { CursorEnum } from 'src/app/grid/enums/cursor_enums';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { TranslateService } from '@ngx-translate/core';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { MenuDataTemplate } from 'src/app/helpers/context-menu-data-template';
import { Menu, MenuItem } from 'src/app/shared/context-menu/context-menu-class';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { Clipboard } from '@angular/cdk/clipboard';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';
import { Subject, takeUntil } from 'rxjs';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { DrawCalendarGanttService } from 'src/app/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';

@Component({
  selector: 'app-absence-gantt-surface',
  templateUrl: './absence-gantt-surface.component.html',
  styleUrls: ['./absence-gantt-surface.component.scss'],
})
export class AbsenceGanttSurfaceComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
  @Input() vScrollbar: AbsenceGanttVScrollbarComponent | undefined;
  @Input() hScrollbar: AbsenceGanttHScrollbarComponent | undefined;
  @Input() absenceMask: AbsenceGanttMaskComponent | undefined;
  @Input() absenceRowHeader: AbsenceGanttRowHeaderComponent | undefined;

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;
  public isBusy = false;
  public isShift = false;
  public isCtrl = false;

  private resizeObserver: ResizeObserver | undefined;
  private resizeSubject: Subject<void> = new Subject<void>();
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  resizeWindow: (() => void) | undefined;
  visibilitychangeWindow: (() => void) | undefined;

  private tooltip: HTMLDivElement | undefined;
  private mouseToBarAlpha: { x: number; y: number } | undefined;
  private copiedBreaks: IBreak[] = [];
  private firstDayDate = new Date(2023, 0, 1);
  private isAbsenceHeaderInit = false;
  private countServices = 0;
  private eventListeners: Array<() => void> = [];
  private box: HTMLDivElement | undefined;

  constructor(
    public holidayCollection: HolidayCollectionService,
    public calendarSetting: CalendarSettingService,
    public dataManagementBreak: DataManagementBreakService,
    public dataManagementAbsence: DataManagementAbsenceGanttService,
    public drawRowHeader: DrawRowHeaderService,
    public scroll: ScrollService,
    public drawCalendarGanttService: DrawCalendarGanttService,
    private zone: NgZone,
    private renderer: Renderer2,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService,
    private translateService: TranslateService,
    private el: ElementRef,
    private clipboard: Clipboard,
    private spinnerService: SpinnerService
  ) {}

  /* #region dom */
  setBodyCursorStyle(cursorStyle: string): void {
    const bodyElem = this.renderer.selectRootElement('body');
    this.renderer.setStyle(bodyElem, 'cursor', cursorStyle);
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
    // this.spinnerService.showProgressSpinner = true;
    this.drawCalendarGanttService.pixelRatio = DrawHelper.pixelRatio();

    this.eventListeners.push(
      this.renderer.listen('window', 'resize', this.resize.bind(this))
    );
    this.eventListeners.push(
      this.renderer.listen('window', 'visibilitychange', this.resize.bind(this))
    );

    this.drawCalendarGanttService.createCanvas();

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;

    this.absenceMask?.UpdateEvent.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
      () => {
        this.onUpdateMask();
      }
    );

    this.drawCalendarGanttService?.hScrollbarRefreshEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.hScrollbar) {
          this.hScrollbar?.refresh();
        }
      });
    this.drawCalendarGanttService?.vScrollbarRefreshEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.vScrollbar) {
          this.vScrollbar?.refresh();
        }
      });
  }

  ngAfterViewInit(): void {
    this.box = document.getElementById('calendarCanvas') as HTMLDivElement;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeSubject.next();
    });
    this.resizeObserver.observe(this.box);

    this.resizeSubject.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.resize();
    });

    this.readServices();

    this.dataManagementBreak.isAbsenceHeaderInit
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.isAbsenceHeaderInit = x;
        if (x) {
          this.drawCalendarGanttService.selectedRow = -1;
          this.dataManagementBreak.canReadBreaks = true;
          this.dataManagementBreak.readYear();
        }
      });

    this.dataManagementBreak.isRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.isAbsenceHeaderInit) {
          this.scroll.maxRows = this.dataManagementBreak.rows;
          this.vScrollbar!.maximumRow = this.dataManagementBreak.rows;

          this.drawCalendarGanttService.setMetrics();
          this.drawCalendarGanttService.checkSelectedRowVisibility();
          this.drawCalendarGanttService.renderCalendar();
          this.drawCalendarGanttService.drawCalendar();
        }
      });

    //Zeichnet die selektierte Zeile neu
    this.dataManagementBreak.isUpdate
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.drawCalendarGanttService.selectedBreakIndex =
          this.dataManagementBreak.indexOfBreak(x);
        this.drawCalendarGanttService.unDrawSelectionRow();
        if (this.drawCalendarGanttService.isSelectedRowVisible()) {
          this.drawCalendarGanttService.drawSelectionRow();
        }
        this.drawCalendarGanttService.drawSelectedBreak();
        this.drawCalendarGanttService.drawRow(
          this.drawCalendarGanttService.selectedRow,
          this.drawCalendarGanttService.selectedBreak
        );
      });

    this.calendarSetting.zoomChangingEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.drawCalendarGanttService.resetAll());
    this.holidayCollection.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((value: any) => {
        this.drawCalendarGanttService.selectedRow = -1;
        this.dataManagementBreak.readYear();
        this.firstDayDate = new Date(this.holidayCollection.currentYear, 0, 1);

        this.drawCalendarGanttService.resetAll();
      });

    const bc = this.readProperty('$gridBackgroundColor');

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawCalendarGanttService.createRuler();
        this.drawCalendarGanttService.drawCalendar();
      });

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.menuClicked(x);
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.eventListeners.forEach((fn) => fn());
    this.eventListeners = [];

    this.drawCalendarGanttService.deleteCanvas();
    this.tooltip = undefined;
  }

  /* #endregion ng */

  /* #region   resize+visibility */

  setFocus(): void {
    const x = this.el.nativeElement as HTMLDivElement;
    if (x) {
      x.autofocus === true;
      x.focus();
      this.drawCalendarGanttService.isFocused = true;
    }
  }

  private resize = (): void => {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGanttService.pixelRatio !== pixelRatio) {
      this.drawCalendarGanttService.pixelRatio = pixelRatio;

      this.drawCalendarGanttService.deleteCanvas();
      this.drawCalendarGanttService.createCanvas();
    }

    if (this.vScrollbar) {
      this.vScrollbar.resize();
    }
  };

  onResize(): void {
    if (!this.drawCalendarGanttService.isCanvasAvailable()) {
      return;
    }

    this.drawCalendarGanttService.height = this.box!.clientHeight;
    this.drawCalendarGanttService.width = this.box!.clientWidth;
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGanttService.pixelRatio !== pixelRatio) {
      this.drawCalendarGanttService.deleteCanvas();
      this.drawCalendarGanttService.createCanvas();
      this.drawCalendarGanttService.pixelRatio = pixelRatio;
    }

    this.drawCalendarGanttService.createRuler();
    this.drawCalendarGanttService.renderRowHeader();
    this.drawCalendarGanttService.drawCalendar();
  }

  /* #endregion   resize+visibility */

  /* #region   select */

  onMouseDown(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    if (this.selectedArea !== SelectedArea.None) {
      this.currentCursor = CursorEnum.wResize;
      if (
        !this.mouseToBarAlpha &&
        this.drawCalendarGanttService.selectedBreakRec
      ) {
        this.mouseToBarAlpha = {
          x: x - this.drawCalendarGanttService.selectedBreakRec.left,
          y: y - this.drawCalendarGanttService.selectedBreakRec.top,
        };
      }
    }
  }

  onMouseUp(event: MouseEvent): void {
    this.currentCursor = CursorEnum.default;
    this.mouseToBarAlpha = undefined;
    this.UpdateSelectedBreakIfNecessary();
  }

  onMouseMove(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    if (this.selectedArea !== SelectedArea.None) {
      if (
        this.drawCalendarGanttService.selectedBreakRec &&
        !this.drawCalendarGanttService.selectedBreakRec.isEmpty()
      ) {
        switch (this.selectedArea) {
          case SelectedArea.LeftAnchor:
            if (this.mouseToBarAlpha) {
              const diffDay = this.drawCalendarGanttService.calcX2Column(x);
              if (diffDay !== 0) {
                if (this.drawCalendarGanttService.selectedBreak) {
                  this.drawCalendarGanttService.selectedBreak.from = addDays(
                    this.firstDayDate,
                    diffDay
                  );

                  if (
                    equalDate(
                      this.drawCalendarGanttService.selectedBreak.from!,
                      this.drawCalendarGanttService.selectedBreak.until!
                    ) > 0
                  ) {
                    this.drawCalendarGanttService.selectedBreak.until =
                      this.drawCalendarGanttService.selectedBreak.from!;
                  }
                  this.drawCalendarGanttService.selectedBreak.internalFrom =
                    transformDateToNgbDateStruct(
                      this.drawCalendarGanttService.selectedBreak.from!
                    );
                }
              }
            }
            break;
          case SelectedArea.RightAnchor:
            if (this.mouseToBarAlpha) {
              const diffDay = this.drawCalendarGanttService.calcX2Column(x);
              if (diffDay !== 0) {
                if (this.drawCalendarGanttService.selectedBreak) {
                  this.drawCalendarGanttService.selectedBreak.until = addDays(
                    this.firstDayDate,
                    diffDay
                  );

                  if (
                    equalDate(
                      this.drawCalendarGanttService.selectedBreak.until!,
                      this.drawCalendarGanttService.selectedBreak.from!
                    ) < 0
                  ) {
                    this.drawCalendarGanttService.selectedBreak.from =
                      this.drawCalendarGanttService.selectedBreak.until!;
                  }
                  this.drawCalendarGanttService.selectedBreak.internalUntil =
                    transformDateToNgbDateStruct(
                      this.drawCalendarGanttService.selectedBreak.until!
                    );
                }
              }
            }
            break;
          case SelectedArea.AbsenceBar:
            if (this.mouseToBarAlpha) {
              const diffA = cloneObject(this.mouseToBarAlpha) as
                | { x: number; y: number }
                | undefined;
              if (diffA) {
                const diffDay = Math.floor(
                  (x -
                    this.drawCalendarGanttService.selectedBreakRec.left -
                    diffA.x) /
                    this.calendarSetting.cellWidth
                );
                if (diffDay !== 0) {
                  if (this.drawCalendarGanttService.selectedBreak) {
                    this.drawCalendarGanttService.selectedBreak.from = addDays(
                      this.drawCalendarGanttService.selectedBreak.from!,
                      diffDay
                    );
                    this.drawCalendarGanttService.selectedBreak.until = addDays(
                      this.drawCalendarGanttService.selectedBreak.until!,
                      diffDay
                    );
                    this.drawCalendarGanttService.selectedBreak.internalFrom =
                      transformDateToNgbDateStruct(
                        this.drawCalendarGanttService.selectedBreak.from!
                      );
                    this.drawCalendarGanttService.selectedBreak.internalUntil =
                      transformDateToNgbDateStruct(
                        this.drawCalendarGanttService.selectedBreak.until!
                      );
                  }
                }
              }
            }
        }

        this.drawCalendarGanttService.drawRowIntern(
          this.drawCalendarGanttService.selectedRow
        );
        this.drawCalendarGanttService.drawSelectionRow();
        this.drawCalendarGanttService.drawSelectedBreak();
      }
    }
  }

  isMouseOverSelectedBreak(event: MouseEvent): boolean {
    var isSelected = false;

    this.existActiveSelection(event);
    if (this.selectedArea === SelectedArea.AbsenceBar) {
      isSelected = true;
    }

    return isSelected;
  }
  onSelectByMouse(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    const dy = y - this.calendarSetting.cellHeaderHeight;
    const height = this.calendarSetting.cellHeight;

    if (dy >= 0) {
      const tmpRow = Math.floor(dy / height);
      const tmpSelectedRow =
        tmpRow + this.drawCalendarGanttService.firstVisibleRow;

      if (this.drawCalendarGanttService.selectedRow !== tmpSelectedRow) {
        this.drawCalendarGanttService.selectedRow = tmpSelectedRow;
        this.selectedArea = SelectedArea.None;
      }

      this.existActiveSelection(event);
      if (
        this.selectedArea === SelectedArea.LeftAnchor ||
        this.selectedArea === SelectedArea.RightAnchor
      ) {
        return;
      }

      this.createBreakSelection(tmpSelectedRow, x);
      this.drawCalendarGanttService.drawSelectedBreak();
    }
  }

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }

  private createBreakSelection(selectedRow: number, x: number): void {
    const width = this.calendarSetting.cellWidth;

    if (x >= 0) {
      const tmpCol =
        Math.floor(x / width) +
        this.drawCalendarGanttService.firstVisibleColumn();

      if (tmpCol === this.drawCalendarGanttService.selectedBreakIndex) {
        return;
      }

      this.drawCalendarGanttService.selectedBreakIndex = -1;
      this.selectedArea = SelectedArea.None;
      const allBreaks = this.dataManagementBreak.readData(selectedRow);
      let index = 0;
      if (allBreaks) {
        allBreaks.forEach((abs) => {
          const diff = Math.floor(
            daysBetweenDates(abs.from as Date, abs.until as Date)
          );
          const col1 = Math.floor(
            daysBetweenDates(
              this.drawCalendarGanttService.startDate,
              abs.from as Date
            )
          );
          const col2 = col1 + diff;

          if (tmpCol >= col1 && tmpCol <= col2) {
            this.drawCalendarGanttService.selectedBreakIndex = index;
            this.selectedArea = SelectedArea.AbsenceBar;

            return;
          }

          index++;
        });
      }
    }
  }

  /// Schaut nach ob ein selektierter Break existiert
  private existActiveSelection(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    if (
      this.drawCalendarGanttService.selectedBreakRec &&
      this.drawCalendarGanttService.selectedBreakRec!.pointInRect(x, y)
    ) {
      this.selectedArea = SelectedArea.AbsenceBar;
      return;
    }
    if (
      this.drawCalendarGanttService.selectedBreakRec &&
      !this.drawCalendarGanttService.selectedBreakRec.isEmpty()
    ) {
      const left = this.drawCalendarGanttService.calcLeftAnchorRectangle(
        this.drawCalendarGanttService.selectedBreakRec!
      );
      if (left.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.LeftAnchor;
        return;
      }

      const right = this.drawCalendarGanttService.calcRightAnchorRectangle(
        this.drawCalendarGanttService.selectedBreakRec!
      );
      if (right.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.RightAnchor;
        return;
      }
    }
    this.selectedArea = SelectedArea.None;
  }

  /* #endregion   select */

  /* #region db*/

  public isSelectedBreak_Dirty(): boolean {
    if (this.drawCalendarGanttService.selectedBreak) {
      const a = this.drawCalendarGanttService.selectedBreak as Break;
      const b = this.drawCalendarGanttService.selectedBreak_dummy as Break;

      if (!compareComplexObjects(a, b)) {
        return true;
      }
    }
    return false;
  }

  public UpdateSelectedBreakIfNecessary() {
    if (this.isSelectedBreak_Dirty()) {
      this.dataManagementBreak.updateBreak(
        this.drawCalendarGanttService.selectedRow,
        this.drawCalendarGanttService.selectedBreak!
      );
    }
  }

  /* #endregion db*/

  /* #region   render */

  moveCalendar(directionX: number, directionY: number): void {
    if (this.isBusy) {
      return;
    }

    const dirX = directionX;
    const dirY = directionY;
    const visibleRow = this.scroll.visibleRows;

    this.scroll.horizontalScrollPosition += dirX;
    this.scroll.verticalScrollPosition += dirY;

    this.zone.runOutsideAngular(() => {
      try {
        this.isBusy = true;
        // horizontale Verschiebung
        if (dirX !== 0) {
          this.drawCalendarGanttService.drawCalendar();
        }
        // vertikale Verschiebung
        if (dirY !== 0) {
          // Nach Unten
          if (dirY > 0) {
            if (dirY < visibleRow / 2) {
              this.moveIt(dirY);
              return;
            } else {
              this.drawCalendarGanttService.renderCalendar();
              return;
            }
          }
          // Nach Oben
          if (dirY < 0) {
            if (dirY * -1 < visibleRow / 2) {
              this.moveIt(dirY);
              return;
            } else {
              this.drawCalendarGanttService.renderCalendar();
            }
          }
        }
      } finally {
        this.isBusy = false;
      }
    });

    this.drawCalendarGanttService.drawCalendar();
  }

  private moveIt(directionY: number): void {
    const visibleRow = this.scroll.visibleRows;

    if (directionY !== 0) {
      const diff = this.scroll.verticalScrollDelta;
      if (diff === 0) {
        return;
      }

      this.drawCalendarGanttService.renderCanvasCtx!.drawImage(
        this.drawCalendarGanttService.renderCanvas!,
        0,
        this.calendarSetting.cellHeight * diff
      );

      let firstRow = 0;
      let lastRow = 0;

      if (directionY > 0) {
        firstRow = visibleRow + this.scroll.verticalScrollPosition - 4;
        lastRow = firstRow + diff * -1 + 4;
      } else {
        firstRow = this.scroll.verticalScrollPosition;
        lastRow = firstRow + diff + 1;
      }

      for (let row = firstRow; row < lastRow; row++) {
        this.drawCalendarGanttService.drawRow(
          row,
          this.drawCalendarGanttService.selectedBreak
        );
      }
    }

    this.drawCalendarGanttService.drawCalendar();
  }

  /* #endregion   render */

  /* #region   draw */

  refreshCalendar(): void {
    this.drawCalendarGanttService.renderCalendar();
    this.drawCalendarGanttService.drawCalendar();
  }

  /* #endregion   draw */

  /* #region   create */

  /* #endregion   create */

  /* #region position and selection */

  holidayInfo(column: number): HolidayDate | undefined {
    const today = addDays(this.drawCalendarGanttService.startDate, column);

    return this.holidayCollection.holidays.holidayList.find(
      (x) => EqualDate(x.currentDate, today) === 0
    );
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
    return this.drawCalendarGanttService.calcCorrectCoordinate(event);
  }

  /* #endregion position and selection */

  /* #region ToolTips */

  showToolTip(value: MultiLanguage, event: MouseEvent): void {
    const name = this.correctName(value);
    if (this.tooltip && this.tooltip!.innerHTML !== name) {
      this.tooltip!.innerHTML = name;

      this.tooltip!.style.display = 'block';
      this.tooltip!.style.opacity = '1';
      this.tooltip!.style.visibility = 'visible';
    }

    this.tooltip!.style.top = event.clientY + 'px';
    this.tooltip!.style.left = event.clientX + 'px';
  }

  hideToolTip() {
    this.destroyToolTip();
  }

  destroyToolTip() {
    this.tooltip!.style.opacity = '0';
    this.tooltip!.style.display = 'none';
    this.tooltip!.innerHTML = '';
    this.tooltip!.style.top = '-9000px';
    this.tooltip!.style.left = '-9000px';
    this.tooltip!.style.visibility = 'hidden';
  }
  /* #endregion ToolTips */

  /* #region   private */

  private readProperty(name: string): string {
    let bodyStyles = window.getComputedStyle(document.body);
    return bodyStyles.getPropertyValue(name);
  }

  private readServices() {
    this.countServices = 0;
    this.gridColors.readData();
    this.gridFonts.readData();
    this.holidayCollection.readData();
    this.dataManagementAbsence.readData();

    this.holidayCollection.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawCalendarGanttService.columns =
          this.drawCalendarGanttService.lastVisibleColumn();

        this.scroll.maxCols = this.drawCalendarGanttService.columns;
        this.addServicesCount();
      });

    this.gridColors.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.addServicesCount());
    this.gridFonts.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.addServicesCount());
  }

  private addServicesCount(): void {
    this.countServices++;

    if (this.countServices === 4) {
      this.countServices = 0;
      this.drawCalendarGanttService.resetAll();
      this.spinnerService.showProgressSpinner = false;
    }
  }

  private correctName(value: MultiLanguage): string {
    const lang = this.translateService.currentLang;

    if (value[lang] !== undefined) {
      return value[lang] ?? '';
    }

    return '';
  }

  /* #endregion   private */

  /* #region   drag-drop */
  dragOver(ev: DragEvent) {
    ev.preventDefault();
    if (ev.dataTransfer) {
      const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);
      if (this.drawCalendarGanttService.dragRow !== position[1]) {
        this.drawCalendarGanttService.unDrawDragRow();
        this.drawCalendarGanttService.dragRow = position[1];
        this.drawCalendarGanttService.drawDragRow();
        this.drawCalendarGanttService.unDrawSelectionRow();
        this.drawCalendarGanttService.drawSelectionRow();
      }
    }
  }

  drop(ev: any) {
    ev.preventDefault();
    if (ev.dataTransfer) {
      const absenceId = ev.dataTransfer.getData('text/plain');
      const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);

      this.drawCalendarGanttService.unDrawDragRow();
      this.drawCalendarGanttService.selectedRow = position[1];

      this.addBreak(position, absenceId);
    }
  }

  private calcDroppedCell(offsetX: number, offsetY: number): number[] {
    if (this.drawCalendarGanttService.isCanvasAvailable()) {
      let deltaX = Math.ceil(offsetX / this.calendarSetting.cellWidth) - 1;
      let deltaY =
        Math.ceil(
          (offsetY - this.calendarSetting.cellHeaderHeight) /
            this.calendarSetting.cellHeight
        ) - 1;

      deltaX += this.scroll.horizontalScrollPosition;
      deltaY += this.scroll.verticalScrollPosition;

      return [deltaX, deltaY];
    }
    return [-1, -1];
  }

  /* #endregion   drag-drop */

  /* #region   show Entry */

  onChangeIndex(index: number): void {
    this.drawCalendarGanttService.selectedBreakIndex = index - 1;
    this.drawCalendarGanttService.drawSelectedBreak();
    this.showBreak();
  }

  showBreak() {
    const tmpBreak = this.dataManagementBreak.readData(
      this.drawCalendarGanttService.selectedRow
    )![this.drawCalendarGanttService.selectedBreakIndex];
    if (tmpBreak) {
      const col1 = Math.floor(
        daysBetweenDates(
          this.drawCalendarGanttService.startDate,
          tmpBreak.from!
        )
      );
      const col2 = Math.floor(
        daysBetweenDates(
          this.drawCalendarGanttService.startDate,
          tmpBreak.until!
        )
      );

      if (this.drawCalendarGanttService.firstVisibleColumn() > col1) {
        const m = col1;
        this.hScrollbar!.value = m!;
        this.scroll.horizontalScrollPosition = m;
        this.drawCalendarGanttService.drawCalendar();
      } else if (this.drawCalendarGanttService.lastVisibleColumn() < col2) {
        const m = col2 - this.drawCalendarGanttService.visibleCol() + 2;
        this.hScrollbar!.value = m!;
        this.scroll.horizontalScrollPosition = m;
        this.drawCalendarGanttService.drawCalendar();
      }
    }
  }

  onUpdateMask() {
    this.drawCalendarGanttService.unDrawSelectionRow();
    this.drawCalendarGanttService.drawSelectionRow();
    this.drawCalendarGanttService.drawSelectedBreak();
    this.showBreak();
  }
  /* #endregion   show Entry */

  /* #region   context Menu */

  menuClicked(keys: string[]) {
    switch (keys[0]) {
      case 'del':
        this.contextMenu!.closeMenu(true);
        this.Delete();
        break;

      case 'copy':
        this.contextMenu!.closeMenu(true);
        this.copy();
        break;
      case 'cut':
        this.contextMenu!.closeMenu(true);
        this.copy();
        this.Delete();
        break;
      case 'paste':
        this.contextMenu!.closeMenu(true);
        this.paste();
        break;
      case 'convertItem':
        this.contextMenu!.closeMenu(true);
        if (this.drawCalendarGanttService.selectedBreak && keys[1]) {
          this.drawCalendarGanttService.selectedBreak.absenceId = keys[1];
          this.updateBreak();
        }
        break;
    }
  }

  createContextMenu(event: MouseEvent) {
    const menuData = new Menu();
    const isOverSelection = this.isMouseOverSelectedBreak(event);

    if (isOverSelection) {
      menuData.list.push(...MenuDataTemplate.copyCutPaste()); //3 menuitem
      menuData.list.push(...MenuDataTemplate.divider()); // menuitem
      menuData.list.push(...MenuDataTemplate.delete()); //1 menuitem
      menuData.list.push(...MenuDataTemplate.divider()); // 1 menuitem

      const convertMenu = new MenuItem(
        'convert',
        MessageLibrary.CONVERT,
        false
      );
      convertMenu.hasMenu = true;
      menuData.list.push(convertMenu); //1 menuitem

      const subMenu = this.createSubConvertMenu();
      if (subMenu) {
        menuData.list[6].menu = subMenu;
      }
    } else {
      menuData.list.push(...MenuDataTemplate.paste()); //1
    }

    var pastMenu = menuData.list.find((x) => x.key === 'paste');
    if (pastMenu) {
      pastMenu.disabled = !this.hasCopiedBreaks();
    }

    this.contextMenu!.menuData = menuData;
  }

  private createSubConvertMenu(): Menu | undefined {
    if (this.drawCalendarGanttService.selectedBreak) {
      const menuData = new Menu();
      const list = this.dataManagementAbsence.absenceList;
      const id = this.drawCalendarGanttService.selectedBreak.id;
      const c = new FallbackPipe();
      list.forEach((x) => {
        if (x.id !== id) {
          const menuItem = new MenuItem(
            'convertItem',
            c.transform(x.name!, this.translateService.currentLang)!,
            false
          );
          menuItem.valueKey = x.id!;
          menuItem.color = x.color;
          menuData.list.push(menuItem);
        }
      });
      return menuData;
    }
    return undefined;
  }
  menuClose() {
    this.contextMenu!.closeMenu();
  }
  /* #endregion   context Menu */

  /* #region   CRUD */
  private addBreak(position: number[], absenceId: string) {
    const client = this.dataManagementBreak.clients[position[1]];
    const absence = this.dataManagementAbsence.absenceList.find(
      (x) => x.id === absenceId
    );
    const newBreak = new Break();
    newBreak.clientId = client.id!;
    delete newBreak.client;
    delete newBreak.absence;
    delete newBreak.id;

    newBreak.absenceId = absenceId!;
    newBreak.from = addDays(
      this.drawCalendarGanttService.startDate,
      position[0]
    );
    newBreak.until = addDays(
      newBreak.from,
      absence!.defaultLength! > 1 ? absence!.defaultLength - 1 : 0
    );
    this.dataManagementBreak.dataBreakService
      .addBreak(newBreak)
      .subscribe((x) => {
        this.dataManagementBreak.addBreak(position[1], x);
        this.drawCalendarGanttService.selectedRow = position[1];
        this.drawCalendarGanttService.selectedBreakIndex =
          this.dataManagementBreak.indexOfBreak(x);
      });
  }

  private updateBreak() {
    if (
      this.drawCalendarGanttService.selectedRow &&
      this.drawCalendarGanttService.selectedBreak
    ) {
      this.dataManagementBreak.updateBreak(
        this.drawCalendarGanttService.selectedRow,
        this.drawCalendarGanttService.selectedBreak
      );
    }
  }
  public Delete() {
    if (
      this.drawCalendarGanttService.selectedRow &&
      this.drawCalendarGanttService.selectedBreak
    ) {
      this.dataManagementBreak.deleteBreak(
        this.drawCalendarGanttService.selectedRow,
        this.drawCalendarGanttService.selectedBreak
      );
    }
  }
  /* #endregion   CRUD */

  /* #region CopyCutPaste */

  public copy() {
    this.copiedBreaks = [];
    if (
      this.drawCalendarGanttService.selectedRow > -1 &&
      this.drawCalendarGanttService.selectedBreak
    ) {
      var tmp = cloneObject(
        this.drawCalendarGanttService.selectedBreak
      ) as Break;

      delete tmp.client;
      delete tmp.absence;
      delete tmp.id;

      const txt = JSON.stringify(tmp);
      this.clipboard.copy(txt);

      this.copiedBreaks.push(tmp);
    }
  }

  private hasCopiedBreaks(): boolean {
    return this.copiedBreaks.length > 0;
  }

  public async paste() {
    if (this.drawCalendarGanttService.selectedRow) {
      this.copiedBreaks.forEach((x) => {
        this.dataManagementBreak.addBreak(
          this.drawCalendarGanttService.selectedRow,
          x
        );
      });
    }
  }
  /* #endregion CopyCutPaste */
}
