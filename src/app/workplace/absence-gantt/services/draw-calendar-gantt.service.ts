import { Injectable, NgZone } from '@angular/core';
import { Rectangle } from '../../../shared/grid/classes/geometry';
import { daysBetweenDates, isLeapYear } from 'src/app/helpers/format-helper';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { IBreak } from 'src/app/core/break-class';
import { HolidayCollectionService } from '../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { GridColorService } from '../../../shared/grid/services/grid-color.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';
import { MyPosition } from 'src/app/shared/grid/classes/position';
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

  private _columns = 365;
  private _isFocused = false;
  private _dragRow = -1;

  constructor(
    public ganttCanvasManager: GanttCanvasManagerService,
    private renderCalendarGrid: RenderCalendarGridService,
    private gridColors: GridColorService,
    private holidayCollection: HolidayCollectionService,
    private calendarSetting: CalendarSettingService,
    private dataManagementBreak: DataManagementBreakService,
    private dataManagementAbsence: DataManagementAbsenceGanttService,
    private scroll: ScrollService,
    private zone: NgZone
  ) {}

  /* #region  render */

  public get selectedBreakRec(): Rectangle | undefined {
    return this.renderCalendarGrid.selectedBreakRec;
  }

  public set selectedBreakRec(value: Rectangle | undefined) {
    this.renderCalendarGrid.selectedBreakRec = value;
  }

  public get isSelectedBreak_Dirty(): boolean {
    return this.renderCalendarGrid.isSelectedBreak_Dirty();
  }

  public createRuler(): void {
    this.renderCalendarGrid.renderRuler();
  }

  public renderCalendar(): void {
    this.renderCalendarGrid.renderCalendar();
  }

  moveCalendar(moveX: boolean, moveY: boolean): void {
    if (this.isBusy) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      try {
        this.isBusy = true;

        if (moveY) {
          this.handleVerticalScroll();
        }
      } finally {
        this.isBusy = false;
      }
    });

    this.drawCalendar();
  }

  /**
   * Decides which render method should be used based on the scroll distance.
   For small scroll movements (less than half of the visible rows), * moveGridVertical is used.
   * moveGridVertical is used, otherwise renderCalendar.
   */
  @CanvasAvailable('queue')
  public handleVerticalScroll(): void {
    try {
      const scrollDelta = this.scroll.verticalScrollDelta;
      if (scrollDelta === 0) {
        return;
      }

      const direction = scrollDelta > 0 ? 1 : -1;

      if (Math.abs(scrollDelta) < this.visibleRow() / 2) {
        this.renderCalendarGrid.moveGridVertical(direction);
      } else {
        this.renderCalendarGrid.renderCalendar();
      }

      this.scroll.resetDeltas();
    } catch (error) {
      console.error('Error in handleVerticalScroll:', error);
      this.renderCalendarGrid.renderCalendar();
      this.scroll.resetDeltas();
    }
  }

  /* #endregion  render */

  /* #region   draw */

  @CanvasAvailable('queue')
  drawCalendar(): void {
    const dx =
      this.scroll.horizontalScrollPosition *
      this.calendarSetting.cellWidth *
      -1;
    this.ganttCanvasManager.ctx!.clearRect(
      0,
      0,
      this.ganttCanvasManager.width,
      this.ganttCanvasManager.height
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
    this.renderCalendarGrid.drawSelectionRow();
  }

  unDrawSelectionRow(): void {
    this.renderCalendarGrid.unDrawSelectionRow();
  }

  drawSelectedBreak(): void {
    this.renderCalendarGrid.drawSelectedBreak();
  }

  public drawRow(index: number, selectedBreak: IBreak | undefined): void {
    this.renderCalendarGrid.drawRow(index, selectedBreak);
  }

  public get selectedBreak(): IBreak | undefined {
    return this.renderCalendarGrid.selectedBreak;
  }

  /* #endregion   draw */

  /* #region   draw intern */

  public drawRowIntern(index: number, isUnselect?: boolean): void {
    this.renderCalendarGrid.drawRowIntern(index, isUnselect);
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
    this.renderCalendarGrid.renderRuler();
    this.renderCalendarGrid.renderCalendar();
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
    const diff = +Math.floor(daysBetweenDates(beginDate, endDate));

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
      this.renderCalendarGrid.selectedRow >= this.firstVisibleRow &&
      this.renderCalendarGrid.selectedRow <
        this.firstVisibleRow + this.visibleRow() &&
      this.renderCalendarGrid.selectedRow < this.dataManagementBreak.rows
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

  public set updateStartDate(value: number) {
    this.renderCalendarGrid.updateStartDate(value);
  }
  public get startDate(): Date {
    return this.renderCalendarGrid.startDate;
  }

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
    return this.scroll.horizontalScrollPosition;
  }

  lastVisibleColumn(): number {
    const last = this.firstVisibleColumn() + this.visibleCol();
    const max = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return last < max ? last : max;
  }

  public get selectedRow(): number {
    return this.renderCalendarGrid.selectedRow;
  }

  public set selectedRow(value: number) {
    this.renderCalendarGrid.selectedRow = value;
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

  public get firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }

  public set selectedBreakIndex(value: number) {
    this.renderCalendarGrid.selectedBreakIndex = value;
  }
  public get selectedBreakIndex() {
    return this.renderCalendarGrid.selectedBreakIndex;
  }

  public lastVisibleRow(): number {
    return this.firstVisibleRow + this.visibleRow();
  }

  public set vScrollbarValue(value: number) {
    this.scroll.verticalScrollPosition = value;
  }

  public set hScrollbarValue(value: number) {
    this.scroll.horizontalScrollPosition = value;
  }

  public get rows(): number {
    return this.dataManagementBreak.rows;
  }

  public checkSelectedRowVisibility(): void {
    this.renderCalendarGrid.checkSelectedRowVisibility();
  }

  public get selectedRowBreaksMaxIndex(): number {
    if (
      this.dataManagementBreak.readData(this.renderCalendarGrid.selectedRow)
    ) {
      return (
        this.dataManagementBreak.readData(this.renderCalendarGrid.selectedRow)!
          .length - 1
      );
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
