import { Injectable, NgZone } from '@angular/core';
import { Rectangle } from '../../../grid/classes/geometry';
import { daysBetweenDates, isLeapYear } from 'src/app/helpers/format-helper';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Break, IBreak } from 'src/app/core/break-class';
import { HolidayCollectionService } from '../../../grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { GridColorService } from '../../../grid/services/grid-color.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { ScrollService } from './scroll.service';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { MyPosition } from 'src/app/grid/classes/position';
import { Subject } from 'rxjs';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { RenderCalendarGridService } from './render-calendar-grid.service';

@Injectable()
export class DrawCalendarGanttService {
  public vScrollbarRefreshEvent = new Subject<boolean>();
  public hScrollbarRefreshEvent = new Subject<boolean>();

  public pixelRatio = 1;
  public isBusy = false;
  public startDate: Date = new Date();
  public selectedBreakRec: Rectangle | undefined;
  public selectedBreak_dummy: IBreak | undefined;

  private _columns: number = 365;
  private _selectedRow = -1;
  private _vScrollbarValue = -1;
  private _hScrollbarValue = -1;
  private _selectedBreakIndex = -1;
  private _isFocused = false;
  private _dragRow = -1;

  constructor(
    public ganttCanvasManager: GanttCanvasManagerService,
    private gridColors: GridColorService,
    private holidayCollection: HolidayCollectionService,
    private calendarSetting: CalendarSettingService,
    private dataManagementBreak: DataManagementBreakService,
    private dataManagementAbsence: DataManagementAbsenceGanttService,
    private scroll: ScrollService,
    private zone: NgZone,
    private renderCalendarGrid: RenderCalendarGridService
  ) {}

  /* #region  render */

  public createRuler(): void {
    this.renderCalendarGrid.renderRuler();
  }

  public renderCalendar(): void {
    this.renderCalendarGrid.renderCalendar();
  }

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
          this.drawCalendar();
        }
        // vertikale Verschiebung
        if (dirY !== 0) {
          // Nach Unten
          if (dirY > 0) {
            if (dirY < visibleRow / 2) {
              this.moveIt(dirY);
              return;
            } else {
              this.renderCalendar();
              return;
            }
          }
          // Nach Oben
          if (dirY < 0) {
            if (dirY * -1 < visibleRow / 2) {
              this.moveIt(dirY);
              return;
            } else {
              this.renderCalendar();
            }
          }
        }
      } finally {
        this.isBusy = false;
      }
    });

    this.drawCalendar();
  }

  private moveIt(directionY: number): void {
    const visibleRow = this.scroll.visibleRows;

    if (directionY !== 0) {
      const diff = this.scroll.verticalScrollDelta;
      if (diff === 0) {
        return;
      }

      this.ganttCanvasManager.renderCanvasCtx!.drawImage(
        this.ganttCanvasManager.renderCanvas!,
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
        this.drawRow(row, this.selectedBreak);
      }
    }

    this.drawCalendar();
  }

  /* #endregion  render */

  /* #region   draw */

  public drawRow(index: number, selectedBreak: IBreak | undefined): void {
    this.renderCalendarGrid.drawRow(index, selectedBreak);
  }

  public drawRowBreaks(index: number, selectedBreak: IBreak | undefined) {
    this.renderCalendarGrid.drawRowBreaks(index, selectedBreak);
  }

  @CanvasAvailable('queue')
  drawCalendar(): void {
    const dx =
      this.scroll.horizontalScrollPosition *
      this.calendarSetting.cellWidth *
      -1;
    this.ganttCanvasManager.ctx!.clearRect(
      0,
      0,
      this.ganttCanvasManager.ctx!.canvas.width,
      this.ganttCanvasManager.ctx!.canvas!.height
    );

    // header
    this.ganttCanvasManager.ctx!.drawImage(
      this.ganttCanvasManager.headerCanvas!,
      dx,
      0
    );

    // body
    this.ganttCanvasManager.ctx!.drawImage(
      this.ganttCanvasManager.renderCanvas!,
      dx,
      this.calendarSetting.cellHeaderHeight
    );

    this.drawSelectionRow();
    this.drawSelectedBreak();

    if (this.isFocused) {
      DrawHelper.drawSelectionBorder(
        this.ganttCanvasManager.ctx!,
        new Rectangle(
          1,
          0,
          this.ganttCanvasManager.ctx!.canvas.width - 1,
          this.ganttCanvasManager.ctx!.canvas!.height
        )
      );
    }
  }

  drawSelectionRow(): void {
    if (
      this.selectedRow !== -1 ||
      this.selectedRow >= this.dataManagementBreak.rows
    ) {
      this.ganttCanvasManager.ctx!.save();

      this.ganttCanvasManager.ctx!.globalAlpha = 0.2;
      this.ganttCanvasManager.ctx!.fillStyle = this.gridColors.focusBorderColor;
      const dy = this.selectedRow - this.scroll.verticalScrollPosition;
      const height = this.calendarSetting.cellHeight;
      const top =
        Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;
      const width =
        (this.lastVisibleColumn() - this.firstVisibleColumn()) *
        this.calendarSetting.cellWidth;
      this.ganttCanvasManager.ctx!.fillRect(0, top, width, height);
      this.drawSelectedBreak();
      this.ganttCanvasManager.ctx!.restore();
    }
  }

  unDrawSelectionRow(): void {
    if (this.selectedRow > -1) {
      if (this.isSelectedRowVisible()) {
        this.drawRowIntern(this.selectedRow);
        this.drawRow(this.selectedRow, this.selectedBreak);
      }
    }
  }

  drawSelectedBreak(): void {
    if (this.selectedBreakIndex !== -1 && this.isSelectedRowVisible()) {
      this.drawBreaksIntern();
    }
  }
  /* #endregion   draw */

  /* #region   draw intern */
  // Zeichnet direkt auf Anzeige-Canvas

  public drawRowIntern(index: number): void {
    const dy = index - this.scroll.verticalScrollPosition;
    const left =
      this.scroll.horizontalScrollPosition *
      this.calendarSetting.cellWidth *
      -1;
    const height = this.calendarSetting.cellHeight;
    const top = Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;
    const rowRec = new Rectangle(
      left,
      top,
      this.ganttCanvasManager.canvas!.width,
      top + height
    );

    this.drawRowSubIntern(index, rowRec);
  }

  private drawRowSubIntern(index: number, rowRec: Rectangle): void {
    if (index < this.dataManagementBreak.rows) {
      // lädt Hintergrund in rowCtx
      this.ganttCanvasManager.rowCtx!!.drawImage(
        this.ganttCanvasManager.backgroundRowCanvas!!,
        0,
        0
      );
      // Zeichnet alle  Breaks in rowCtx
      this.drawRowBreaks(index, this.selectedBreak);
      // Zeichnet rowCtx in ctx
      this.ganttCanvasManager.ctx!.drawImage(
        this.ganttCanvasManager.rowCanvas!!,
        rowRec.x,
        rowRec.y
      );
    } else {
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.ctx!,
        this.gridColors.backGroundContainerColor,
        rowRec
      );
    }
  }

  drawBreaksIntern() {
    if (
      this.selectedRow !== -1 ||
      this.selectedRow >= this.dataManagementBreak.rows
    ) {
      const dy =
        this.calendarSetting.cellHeaderHeight +
        (this.selectedRow - this.scroll.verticalScrollPosition) *
          this.calendarSetting.cellHeight;
      const dx =
        this.scroll.horizontalScrollPosition *
        this.calendarSetting.cellWidth *
        -1;
      const tmpBreak = this.dataManagementBreak.readData(this.selectedRow)![
        this.selectedBreakIndex
      ];

      if (tmpBreak) {
        const tmpRec = this.calcDateRectangle(
          tmpBreak.from as Date,
          tmpBreak.until as Date
        );
        const rec = tmpRec.translate(dx, dy);
        this.selectedBreakRec = rec.setBounds(
          rec.left - 1,
          rec.top - 1,
          rec.right + 1,
          rec.bottom + 1
        );
        const abs = this.dataManagementAbsence.absenceList.find(
          (as) => as.id === tmpBreak.absenceId
        );
        if (abs) {
          this.drawBreakIntern(rec, abs.color!);
          this.drawBreakSelectBorderIntern(this.selectedBreakRec);
          this.drawBreakSelectBorderInternAnchor(this.selectedBreakRec);
        }
      }
    }
  }

  private drawBreakIntern(rec: Rectangle, color: string) {
    DrawHelper.fillRectangle(this.ganttCanvasManager.ctx!, color, rec);
  }

  private drawBreakSelectBorderIntern(rec: Rectangle) {
    DrawHelper.drawSelectionBorder(this.ganttCanvasManager.ctx!, rec);
  }

  private drawBreakSelectBorderInternAnchor(rec: Rectangle) {
    DrawHelper.drawAnchor(
      this.ganttCanvasManager.ctx!,
      this.calcLeftAnchorRectangle(rec)
    );
    DrawHelper.drawAnchor(
      this.ganttCanvasManager.ctx!,
      this.calcRightAnchorRectangle(rec)
    );
  }

  /* #endregion   draw intern */

  /* #region   init */

  public deleteCanvas() {
    this.ganttCanvasManager.deleteCanvas();
  }

  public createCanvas() {
    this.ganttCanvasManager.createCanvas();
  }

  @CanvasAvailable('queue')
  public resetAll(): void {
    this.setMetrics();
    this.createRuler();
    this.renderCalendar();
    this.drawCalendar();
  }

  /* #endregion   init */

  /* #region   calc */

  public calcRowRec(
    index: number,
    verticalScrollPosition: number,
    cellHeight: number
  ): Rectangle {
    return this.renderCalendarGrid.calcRowRec(
      index,
      verticalScrollPosition,
      cellHeight
    );
  }

  public calcDateRectangle(beginDate: Date, endDate: Date): Rectangle {
    let diff = +Math.floor(daysBetweenDates(beginDate, endDate));

    const col1 = Math.floor(daysBetweenDates(this.startDate, beginDate));
    const col2 = col1 + diff;
    const d1 = col1 * this.calendarSetting.cellWidth;
    const d2 = col2 * this.calendarSetting.cellWidth;

    const cellHeight = this.calendarSetting.cellHeight;
    const cellLayerHeight = Math.floor(cellHeight / 4);

    return new Rectangle(
      Math.floor(d1),
      cellLayerHeight,
      Math.floor(d2 + this.calendarSetting.cellWidth),
      cellLayerHeight * 3
    );
  }

  public isSelectedRowVisible(): boolean {
    if (
      this.selectedRow >= this.firstVisibleRow &&
      this.selectedRow < this.firstVisibleRow + this.visibleRow() &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      return true;
    }

    return false;
  }

  @CanvasAvailable('queue')
  calcCorrectCoordinate(event: MouseEvent) {
    let row = -1;
    let col = -1;
    const rect = this.ganttCanvasManager.canvas!.getBoundingClientRect();
    const x: number = event.clientX - rect.left;
    const y: number = event.clientY - rect.top;

    if (y >= this.calendarSetting.cellHeaderHeight) {
      row =
        Math.floor(
          (y - this.calendarSetting.cellHeaderHeight) /
            this.calendarSetting.cellHeight
        ) + this.scroll.verticalScrollPosition;
      col = this.calcX2Column(x);
    }

    return new MyPosition(row, col);
  }

  public calcX2Column(x: number): number {
    return (
      Math.floor(x / this.calendarSetting.cellWidth) +
      this.scroll.horizontalScrollPosition
    );
  }

  public calcLeftAnchorRectangle(rec: Rectangle): Rectangle {
    const top = rec.top + rec.height / 2 - this.calendarSetting.anchorWidth / 2;
    return new Rectangle(
      rec.left - this.calendarSetting.anchorWidth,
      top,
      rec.left,
      top + this.calendarSetting.anchorWidth
    );
  }

  public calcRightAnchorRectangle(rec: Rectangle): Rectangle {
    const top = rec.top + rec.height / 2 - this.calendarSetting.anchorWidth / 2;
    return new Rectangle(
      rec.right,
      top,
      rec.right + this.calendarSetting.anchorWidth,
      top + this.calendarSetting.anchorWidth
    );
  }

  /* #endregion   calc */

  /* #region Environment changes */

  public set width(value: number) {
    this.ganttCanvasManager.width = value;
  }

  public get width(): number {
    return this.ganttCanvasManager.width;
  }

  public set height(value: number) {
    this.ganttCanvasManager.height = value;
  }
  firstVisibleColumn(): number {
    return this.ganttCanvasManager.height;
  }

  lastVisibleColumn(): number {
    const last = this.firstVisibleColumn() + this.visibleCol();
    const max = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return last < max ? last : max;
  }

  public get columns(): number {
    return this._columns;
  }
  public set columns(value: number) {
    this._columns = value;
  }

  public SetColumns(): void {
    this._columns = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    this.scroll.maxCols = this._columns;
  }

  public set selectedRow(value: number) {
    if (value === this._selectedRow) {
      return;
    }

    // Die letzte Absenz wird desektiert
    this._selectedBreakIndex = -1;
    this.selectedRow = -1;
    this.unDrawSelectionRow();

    if (value < 0) {
      this._selectedRow = 0;
    } else if (value > this.dataManagementBreak.rows) {
      this._selectedRow = this.dataManagementBreak.rows;
    } else {
      this._selectedRow = value;
    }
    this.drawSelectionRow();
    this.selectedRow = this._selectedRow;
  }

  public get selectedRow(): number {
    return this._selectedRow;
  }

  public get firstVisibleRow(): number {
    return this._vScrollbarValue;
  }

  public set selectedBreakIndex(value: number) {
    if (value === this._selectedBreakIndex) {
      return;
    }
    this._selectedBreakIndex = value;
    this.unDrawSelectionRow();
    this.drawSelectionRow();
    this.drawSelectedBreak();
  }
  public get selectedBreakIndex() {
    return this._selectedBreakIndex;
  }

  public get selectedBreak(): IBreak | undefined {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      const br = this.dataManagementBreak.readData(this.selectedRow)![
        this._selectedBreakIndex
      ];
      this.selectedBreak_dummy = undefined;
      if (br) {
        this.selectedBreak_dummy = cloneObject(br as Break);
      }
      return br;
    }
    return undefined;
  }

  public lastVisibleRow(): number {
    return this.firstVisibleRow + this.visibleRow();
  }

  public set vScrollbarValue(value: number) {
    this._vScrollbarValue = value;
  }

  public set hScrollbarValue(value: number) {
    this._hScrollbarValue = value;
  }

  public get rows(): number {
    return this.dataManagementBreak.rows;
  }

  public checkSelectedRowVisibility(): void {
    if (this.selectedRow > this.dataManagementBreak.rows) {
      this.selectedRow = -1;
    }
  }

  public get selectedRowBreaksMaxIndex(): number {
    if (this.dataManagementBreak.readData(this.selectedRow)) {
      return this.dataManagementBreak.readData(this.selectedRow)!.length - 1;
    }
    return -1;
  }
  /* #endregion Environment changes */

  /* #region   metrics */
  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  @CanvasAvailable('queue')
  public setMetrics(): void {
    this.ganttCanvasManager;
    const visibleRows: number =
      Math.floor(
        this.ganttCanvasManager.canvas!.clientHeight /
          this.calendarSetting.cellHeight
      ) - 1;
    const visibleCols: number =
      Math.floor(
        this.ganttCanvasManager.canvas!.clientWidth /
          this.calendarSetting.cellWidth
      ) - 1;
    // this.scroll.setMetrics(
    //   visibleCols,
    //   this._columns,
    //   visibleRows,
    //   this.dataManagementBreak.rows
    // );

    this.vScrollbarRefreshEvent.next(true);
    this.hScrollbarRefreshEvent.next(true);
  }

  visibleCol(): number {
    if (!this.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.width / this.calendarSetting.cellWidth
    );
  }

  visibleRow(): number {
    if (!this.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.height / this.calendarSetting.cellHeight
    );
  }

  /* #endregion   metrics */

  /* #region drag drop */

  get isFocused(): boolean {
    return this._isFocused;
  }

  set isFocused(value: boolean) {
    this._isFocused = value;
    this.drawCalendar();
  }

  get dragRow() {
    return this._dragRow;
  }

  set dragRow(value: number) {
    this._dragRow = value;
  }

  public drawDragRow(): void {
    if (this.dragRow > -1) {
      if (this.isDragRowVisible()) {
        this.ganttCanvasManager.ctx!.save();
        this.ganttCanvasManager.ctx!.globalAlpha = 0.08;
        this.ganttCanvasManager.ctx!.fillStyle =
          this.gridColors.focusBorderColor;
        const dy = this.dragRow - this.scroll.verticalScrollPosition;
        const height = this.calendarSetting.cellHeight;
        const top =
          Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;

        this.ganttCanvasManager.ctx!.fillRect(
          0,
          top,
          this.ganttCanvasManager.canvas!.width,
          height
        );

        this.ganttCanvasManager.ctx!.restore();
      }
    }
  }

  public unDrawDragRow(): void {
    if (this.dragRow > -1) {
      if (this.isDragRowVisible()) this.drawRowIntern(this.dragRow);
    }
  }

  public isDragRowVisible(): boolean {
    if (
      this.dragRow >= this.firstVisibleRow &&
      this.dragRow < this.firstVisibleRow + this.visibleRow() &&
      this.dragRow < this.dataManagementBreak.rows
    ) {
      return true;
    }

    return false;
  }

  /* #endregion drag drop */
}
