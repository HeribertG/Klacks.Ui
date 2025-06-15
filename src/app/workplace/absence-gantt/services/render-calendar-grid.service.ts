import { inject, Injectable } from '@angular/core';
import { Rectangle } from '../../../shared/grid/classes/geometry';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { CalendarHeaderDayRank } from 'src/app/core/absence-class';
import { HolidayCollectionService } from '../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { GridColorService } from '../../../shared/grid/services/grid-color.service';
import { GridFontsService } from '../../../shared/grid/services/grid-fonts.service';
import { TranslateService } from '@ngx-translate/core';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';
import { GridSettingsService } from 'src/app/shared/grid/services/grid-settings.service';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import {
  EqualDate,
  addDays,
  daysBetweenDates,
  getDaysInMonth,
  isLeapYear,
} from 'src/app/helpers/format-helper';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from '../../../shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from '../../../shared/grid/enums/gradient-3d-border-style';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { Break, IBreak } from 'src/app/core/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { BreakLayerService } from './break-layer.service';

/**
 * Main class for rendering the calendar grid
 *
 * Functions:
 * - Renders annual calendar with months, weeks, days
 * - Manages selections of rows and breaks (time periods)
 * - Implements horizontal/vertical scrolling
 * - Draws weekends and public holidays
 * Calculates leap years and month lengths
 *
 * Properties:
 * startDate: Start date of the calendar (1 January)
 * selectedRow: Currently selected row
 * selectedBreak: Currently selected period
 *
 * Main methods:
 * renderRuler(): Draws header grid
 * renderCalendar(): Renders the complete calendar
 * moveGridVertical(): Handles vertical scrolling
 * drawRow(): Draws a row
 */
@Injectable()
export class RenderCalendarGridService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private holidayCollection = inject(HolidayCollectionService);
  private calendarSetting = inject(CalendarSettingService);
  private gridSetting = inject(GridSettingsService);
  private gridFonts = inject(GridFontsService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private translateService = inject(TranslateService);
  private scroll = inject(ScrollService);
  private breakLayerService = inject(BreakLayerService);

  public startDate: Date = new Date(new Date().getFullYear(), 0, 1);

  public selectedBreakRec: Rectangle | undefined;
  public selectedBreak_dummy: IBreak | undefined;

  private readonly SUNDAY = 0;
  private readonly SATURDAY = 6;
  private readonly MINCELLWITHFORDAYRANK = 20;

  private _selectedRow = -1;
  private _selectedBreakIndex = -1;

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  public updateStartDate(year: number): void {
    this.startDate = new Date(year, 0, 1);
  }

  @CanvasAvailable('queue')
  public renderRuler(): void {
    this.startDate = new Date(this.holidayCollection.currentYear, 0, 1);

    const headerDayRank = new Array<CalendarHeaderDayRank>();
    const monthsRect = new Array<Rectangle>();

    const daysPerYear = this.calcDaysPerYear();
    this.sizeCanvas(this.getWidth());
    this.drawDaysBorderlineOnRuler(daysPerYear, headerDayRank, monthsRect);
    this.drawMonthBorder(monthsRect);
    this.copyRulerOnHeadline();
    this.drawWeekendDayNumberOnHeadline(headerDayRank);
    this.drawMonthBarOnHeadline();
  }

  @CanvasAvailable('queue')
  public renderCalendar(): void {
    this.ganttCanvasManager.renderCanvas!.height =
      this.ganttCanvasManager.height;
    this.ganttCanvasManager.renderCanvas!.width = this.getWidth();

    const rowsToRender = [];
    for (let i = 0; i < this.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      rowsToRender.push(posDelta);
    }

    for (let i = 0; i < this.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      this.drawRow(posDelta, undefined);
    }
  }

  public moveGridVertical(directionY: number): void {
    const SAFETY_MARGIN = 3;
    const visibleRows = this.visibleRow();
    const diff = this.scroll.verticalScrollDelta;

    if (directionY === 0 || diff === 0) {
      return;
    }

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.ganttCanvasManager.renderCanvas!.width;
      tempCanvas.height = this.ganttCanvasManager.renderCanvas!.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        console.error('Could not create 2D context for temporary canvas');
        return;
      }

      tempCtx.drawImage(this.ganttCanvasManager.renderCanvas!, 0, 0);

      // löschen den Canvas
      this.ganttCanvasManager.renderCanvasCtx!.clearRect(
        0,
        0,
        this.ganttCanvasManager.renderCanvas!.width,
        this.ganttCanvasManager.renderCanvas!.height
      );

      if (diff > 0) {
        const pixelDelta = diff * this.calendarSetting.cellHeight;

        this.ganttCanvasManager.renderCanvasCtx!.drawImage(
          tempCanvas,
          0,
          pixelDelta,
          tempCanvas.width,
          tempCanvas.height - pixelDelta,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height - pixelDelta
        );

        const startRow =
          this.scroll.verticalScrollPosition +
          visibleRows -
          diff -
          SAFETY_MARGIN;
        const endRow =
          this.scroll.verticalScrollPosition + visibleRows + SAFETY_MARGIN;

        for (let row = startRow; row < endRow; row++) {
          if (row >= 0 && row < this.dataManagementBreak.rows) {
            const rowPosition =
              (row - this.scroll.verticalScrollPosition) *
              this.calendarSetting.cellHeight;

            if (
              rowPosition >= -SAFETY_MARGIN * this.calendarSetting.cellHeight &&
              rowPosition <
                this.ganttCanvasManager.renderCanvas!.height +
                  SAFETY_MARGIN * this.calendarSetting.cellHeight
            ) {
              const rowRect = this.calcRowRec(
                row,
                this.scroll.verticalScrollPosition,
                this.calendarSetting.cellHeight
              );

              this.drawRowSub(row, rowRect, this.selectedBreak);
            }
          }
        }
      } else {
        const absDiff = Math.abs(diff);
        const pixelDelta = absDiff * this.calendarSetting.cellHeight;

        this.ganttCanvasManager.renderCanvasCtx!.drawImage(
          tempCanvas,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height - pixelDelta,
          0,
          pixelDelta,
          tempCanvas.width,
          tempCanvas.height - pixelDelta
        );

        const startRow = this.scroll.verticalScrollPosition - SAFETY_MARGIN;
        const endRow =
          this.scroll.verticalScrollPosition + absDiff + SAFETY_MARGIN;

        for (let row = startRow; row < endRow; row++) {
          if (row >= 0 && row < this.dataManagementBreak.rows) {
            const rowPosition =
              (row - this.scroll.verticalScrollPosition) *
              this.calendarSetting.cellHeight;
            if (
              rowPosition >= -SAFETY_MARGIN * this.calendarSetting.cellHeight &&
              rowPosition <
                pixelDelta + SAFETY_MARGIN * this.calendarSetting.cellHeight
            ) {
              const rowRect = this.calcRowRec(
                row,
                this.scroll.verticalScrollPosition,
                this.calendarSetting.cellHeight
              );

              this.drawRowSub(row, rowRect, this.selectedBreak);
            }
          }
        }
      }
    } catch {
      this.renderCalendar();
    }
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
        this.selectedBreak_dummy = cloneObject<Break>(br as Break);
      }
      return br;
    }
    return undefined;
  }

  public set selectedRow(value: number) {
    if (value === this._selectedRow) {
      return;
    }

    // The last absence is deselected
    this._selectedBreakIndex = -1;
    this._selectedRow = -1;
    this.unDrawSelectionRow();

    if (value < 0) {
      this._selectedRow = 0;
    } else if (value > this.dataManagementBreak.rows) {
      this._selectedRow = this.dataManagementBreak.rows;
    } else {
      this._selectedRow = value;
    }
    this.drawSelectionRow();
  }

  public get selectedRow(): number {
    return this._selectedRow;
  }

  public get firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }

  public drawSelectionRow(): void {
    if (
      this.selectedRow !== -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      this.ganttCanvasManager.ctx!.save();

      const dy = this.selectedRow - this.scroll.verticalScrollPosition;
      const height = this.calendarSetting.cellHeight;
      const top =
        Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;

      const calculatedWidth =
        (this.lastVisibleColumn() - this.firstVisibleColumn()) *
        this.calendarSetting.cellWidth;

      const width =
        calculatedWidth > 0 ? calculatedWidth : this.ganttCanvasManager.width;

      // Wichtig: Setze einen Clipping-Bereich, der den Header ausschließt
      this.ganttCanvasManager.ctx!.beginPath();
      this.ganttCanvasManager.ctx!.rect(
        0,
        this.calendarSetting.cellHeaderHeight,
        this.ganttCanvasManager.width,
        this.ganttCanvasManager.height - this.calendarSetting.cellHeaderHeight
      );
      this.ganttCanvasManager.ctx!.clip();

      // Zeichne die Auswahl
      this.ganttCanvasManager.ctx!.globalAlpha = 0.2;
      this.ganttCanvasManager.ctx!.fillStyle = this.gridColors.focusBorderColor;
      this.ganttCanvasManager.ctx!.fillRect(0, top, width, height);

      this.drawSelectedBreak();
      this.ganttCanvasManager.ctx!.restore();
    }
  }

  public unDrawSelectionRow(): void {
    if (this.selectedRow > -1) {
      if (this.isSelectedRowVisible()) {
        this.drawRowIntern(this.selectedRow);

        this.drawRow(this.selectedRow, undefined);
      }
    }
  }

  public drawSelectedBreak(): void {
    if (this.selectedBreakIndex !== -1 && this.isSelectedRowVisible()) {
      this.drawBreaksIntern();
    }
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

  public drawBreaksIntern() {
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
        const abs = this.dataManagementAbsence
          .absenceList()
          .find((as) => as.id === tmpBreak.absenceId);
        if (abs) {
          this.drawBreakIntern(rec, abs.color!);
          this.drawBreakSelectBorderIntern(this.selectedBreakRec);
          this.drawBreakSelectBorderInternAnchor(this.selectedBreakRec);
        }
      }
    }
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

  public drawRowIntern(index: number, isUndraw = false): void {
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

    this.drawRowSubIntern(index, rowRec, isUndraw);
  }

  firstVisibleColumn(): number {
    return this.scroll.horizontalScrollPosition;
  }

  public lastVisibleColumn(): number {
    const last = this.firstVisibleColumn() + this.visibleCol();
    const max = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return last < max ? last : max;
  }

  public visibleCol(): number {
    if (!this.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.width / this.calendarSetting.cellWidth
    );
  }

  public visibleRow(): number {
    if (!this.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.height / this.calendarSetting.cellHeight
    );
  }

  public checkSelectedRowVisibility(): void {
    if (this.selectedRow > this.dataManagementBreak.rows) {
      this.selectedRow = -1;
    }
  }

  public isSelectedBreak_Dirty(): boolean {
    if (this.selectedBreak) {
      const a = this.selectedBreak as Break;
      const b = this.selectedBreak_dummy as Break;

      if (!compareComplexObjects(a, b)) {
        return true;
      }
    }
    return false;
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

  private drawRowSubIntern(
    index: number,
    rowRec: Rectangle,
    isUndraw: boolean
  ): void {
    if (index < this.dataManagementBreak.rows) {
      // loads background in rowCtx
      this.ganttCanvasManager.rowCtx!.drawImage(
        this.ganttCanvasManager.backgroundRowCanvas!,
        0,
        0
      );
      // Draws all breaks in rowCtx
      if (isUndraw) {
        this.drawRowBreaks(index, undefined);
      } else {
        this.drawRowBreaks(index, this.selectedBreak);
      }

      // Draws rowCtx in ctx
      this.ganttCanvasManager.ctx!.drawImage(
        this.ganttCanvasManager.rowCanvas!,
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

  private calcDaysPerYear(): number {
    return isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
  }

  @CanvasAvailable('queue')
  private sizeCanvas(maxWidth: number): void {
    const cellHeight = this.calendarSetting.cellHeight;
    this.ganttCanvasManager.backgroundRowCanvas!.height = cellHeight;
    this.ganttCanvasManager.rowCanvas!.height = cellHeight;
    const headerHeight = this.calendarSetting.cellHeaderHeight;
    this.ganttCanvasManager.headerCanvas!.height = headerHeight;

    this.ganttCanvasManager.backgroundRowCanvas!.width = maxWidth;
    this.ganttCanvasManager.rowCanvas!.width =
      this.ganttCanvasManager.backgroundRowCanvas!.width;
    this.ganttCanvasManager.headerCanvas!.width = maxWidth;
  }

  @CanvasAvailable('queue')
  drawDaysBorderlineOnRuler(
    daysPerYear: number,
    headerDayRank: CalendarHeaderDayRank[],
    monthsRect: Rectangle[]
  ) {
    this.drawMonthBackgrounds(monthsRect);
    this.drawDayBackgrounds(daysPerYear, headerDayRank);
  }

  @CanvasAvailable('queue')
  private drawMonthBackgrounds(monthsRect: Rectangle[]) {
    let lastDays = 0;
    for (let i = 0; i < 12; i++) {
      const actualDays = getDaysInMonth(this.holidayCollection.currentYear, i);
      const leftDayCell = lastDays * this.calendarSetting.cellWidth;
      const sizeDayCell = actualDays * this.calendarSetting.cellWidth;

      const monthRec = new Rectangle(
        leftDayCell,
        0,
        leftDayCell + sizeDayCell + this.calendarSetting.cellWidth,
        this.ganttCanvasManager.backgroundRowCanvas!.height
      );
      lastDays += actualDays;

      this.fillMonthRectangle(monthRec, i);
      monthsRect.push(monthRec);
    }
  }

  @CanvasAvailable('queue')
  private fillMonthRectangle(rec: Rectangle, monthIndex: number) {
    const color =
      monthIndex % 2 === 0
        ? this.gridColors.evenMonthColor
        : this.gridColors.oddMonthColor;
    DrawHelper.fillRectangle(
      this.ganttCanvasManager.backgroundRowCtx!,
      color,
      rec
    );
  }

  private calculateDayRectangle(dayIndex: number): Rectangle {
    const d = dayIndex * this.calendarSetting.cellWidth;
    return new Rectangle(
      Math.floor(d),
      0,
      Math.floor(d + this.calendarSetting.cellWidth),
      this.calendarSetting.cellHeaderHeight
    );
  }

  private isHoliday(date: Date): boolean {
    if (
      !this.holidayCollection.holidays ||
      this.holidayCollection.holidays.holidayList.length === 0
    ) {
      return false;
    }
    return this.holidayCollection.holidays.holidayList.some(
      (x) => EqualDate(x.currentDate, date) === 0
    );
  }

  @CanvasAvailable('queue')
  private drawHolidayBackground(dayRect: Rectangle, date: Date) {
    const holiday = this.holidayCollection.holidays!.holidayList.find(
      (x) => EqualDate(x.currentDate, date) === 0
    );
    if (holiday) {
      const color = holiday.officially
        ? this.gridColors.backGroundColorOfficiallyHoliday
        : this.gridColors.backGroundColorHolyday;
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.backgroundRowCtx!,
        color,
        dayRect
      );
      DrawHelper.drawBaseBorder(
        this.ganttCanvasManager.backgroundRowCtx!,
        this.gridColors.borderColor,
        this.calendarSetting.increaseBorder,
        dayRect
      );
    }
  }

  @CanvasAvailable('queue')
  private drawDayBackgrounds(
    daysPerYear: number,
    headerDayRank: CalendarHeaderDayRank[]
  ) {
    for (let i = 0; i < daysPerYear; i++) {
      const currDate = addDays(this.startDate, i);
      const dayRect = this.calculateDayRectangle(i);

      if (this.isHoliday(currDate)) {
        this.drawHolidayBackground(dayRect, currDate);
      } else {
        const dayOfWeek = currDate.getDay();
        if (dayOfWeek === this.SUNDAY || dayOfWeek === this.SATURDAY) {
          this.drawWeekendBackground(dayRect, dayOfWeek === this.SUNDAY);
        } else {
          this.drawWeekdayBorder(dayRect);
        }
      }

      this.addDayNumberToHeader(currDate, dayRect, headerDayRank);
    }
  }

  @CanvasAvailable('queue')
  private drawWeekendBackground(dayRect: Rectangle, isWeekend: boolean) {
    const backgroundColor = isWeekend
      ? this.gridColors.backGroundColorSunday
      : this.gridColors.backGroundColorSaturday;

    DrawHelper.fillRectangle(
      this.ganttCanvasManager.backgroundRowCtx!,
      backgroundColor,
      dayRect
    );
    DrawHelper.drawBaseBorder(
      this.ganttCanvasManager.backgroundRowCtx!,
      this.gridColors.borderColor,
      this.calendarSetting.increaseBorder,
      dayRect
    );
  }

  private drawWeekdayBorder(dayRect: Rectangle) {
    DrawHelper.drawBaseBorder(
      this.ganttCanvasManager.backgroundRowCtx!,
      this.gridColors.borderColor,
      0.5,
      dayRect
    );
  }

  private addDayNumberToHeader(
    date: Date,
    dayRect: Rectangle,
    headerDayRank: CalendarHeaderDayRank[]
  ) {
    const dayOfWeek = date.getDay();

    if (dayOfWeek === this.SUNDAY || dayOfWeek === this.SATURDAY) {
      const headerDay = new CalendarHeaderDayRank();
      headerDay.name = date.getDate().toString();
      headerDay.rect = this.calculateHeaderDayRect(
        dayRect,
        this.MINCELLWITHFORDAYRANK,
        dayOfWeek === this.SATURDAY
      );
      headerDay.backColor =
        dayOfWeek === this.SUNDAY
          ? this.gridColors.backGroundColorSunday
          : this.gridColors.backGroundColorSaturday;

      headerDayRank.push(headerDay);
    }
  }

  private calculateHeaderDayRect(
    dayRect: Rectangle,
    minWidth: number,
    isSaturday: boolean
  ): Rectangle {
    const rankTop = this.ganttCanvasManager.backgroundRowCanvas!.height;
    const rankHeight =
      this.ganttCanvasManager.headerCanvas!.height -
      this.ganttCanvasManager.backgroundRowCanvas!.height;
    return new Rectangle(
      isSaturday ? dayRect.right - minWidth : dayRect.left,
      rankTop,
      isSaturday ? dayRect.right : dayRect.left + minWidth,
      rankTop + rankHeight
    );
  }

  @CanvasAvailable('queue')
  private drawMonthBorder(monthsRect: Rectangle[]) {
    this.ganttCanvasManager.backgroundRowCtx!.save();
    this.ganttCanvasManager.backgroundRowCtx!.lineWidth = 1;
    this.ganttCanvasManager.backgroundRowCtx!.strokeStyle =
      this.gridColors.borderColorEndMonth;

    monthsRect.forEach((x) => {
      if (this.ganttCanvasManager.backgroundRowCtx!) {
        this.ganttCanvasManager.backgroundRowCtx!.moveTo(x.left, x.top);
        this.ganttCanvasManager.backgroundRowCtx!.lineTo(x.left, x.bottom);
        this.ganttCanvasManager.backgroundRowCtx!.stroke();
      }
    });
    this.ganttCanvasManager.backgroundRowCtx!.restore();
  }

  private copyRulerOnHeadline() {
    this.ganttCanvasManager.headerCtx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!,
      0,
      this.ganttCanvasManager.backgroundRowCanvas!.height
    );
  }

  @CanvasAvailable('queue')
  private drawWeekendDayNumberOnHeadline(
    headerDayRank: CalendarHeaderDayRank[]
  ) {
    //Zeichne Monatstage am Samstag und Sonntag
    if (this.calendarSetting.cellWidth * 2 >= this.MINCELLWITHFORDAYRANK) {
      headerDayRank.forEach((x) => {
        if (this.ganttCanvasManager.headerCtx!) {
          DrawHelper.fillRectangle(
            this.ganttCanvasManager.headerCtx!,
            x.backColor,
            x.rect
          );

          DrawHelper.drawText(
            this.ganttCanvasManager.headerCtx!,
            x.name,
            x.rect.left,
            x.rect.top,
            x.rect.width,
            x.rect.height,
            this.gridFonts.firstSubFontName,
            +this.gridFonts.firstSubFontSize,
            this.gridColors.foreGroundColor,
            TextAlignmentEnum.Center,
            BaselineAlignmentEnum.Center
          );
        }
      });
    }
  }

  @CanvasAvailable('queue')
  private drawMonthBarOnHeadline() {
    // Zeichne Monatsbalken mit Monatsnamen
    let lastDays = 0;
    for (let i = 0; i < 12; i++) {
      const actualDays = getDaysInMonth(this.holidayCollection.currentYear, i);

      const leftMonthCell =
        lastDays * this.calendarSetting.cellWidth +
        this.calendarSetting.borderWidth;
      const sizeMonthCell =
        actualDays * this.calendarSetting.cellWidth -
        this.calendarSetting.borderWidth;
      const monthRec = new Rectangle(
        leftMonthCell,
        0,
        leftMonthCell + sizeMonthCell,
        this.ganttCanvasManager.backgroundRowCanvas!.height
      );
      lastDays += actualDays;
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.headerCtx!,
        this.gridColors.controlBackGroundColor,
        monthRec
      );

      DrawHelper.drawText(
        this.ganttCanvasManager.headerCtx!,
        this.translateService.instant(this.gridSetting.monthsName[i]),
        monthRec.left,
        monthRec.top,
        monthRec.width,
        monthRec.height,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.mainFontColor,
        TextAlignmentEnum.Center,
        BaselineAlignmentEnum.Center
      );

      DrawHelper.drawBorder(
        this.ganttCanvasManager.headerCtx!,
        monthRec.left,
        monthRec.top,
        monthRec.width,
        monthRec.height,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );
    }
  }

  @CanvasAvailable('queue')
  public drawRow(index: number, selectedBreak: IBreak | undefined): void {
    const rec = this.calcRowRec(
      index,
      this.scroll.verticalScrollPosition,
      this.calendarSetting.cellHeight
    );

    this.drawRowSub(index, rec, selectedBreak);
  }

  private getWidth(): number {
    const year = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return this.calendarSetting.cellWidth * year + 1;
  }

  @CanvasAvailable('queue')
  public calcRowRec(
    index: number,
    verticalScrollPosition: number,
    cellHeight: number
  ): Rectangle {
    const dy = index - verticalScrollPosition;
    const height = cellHeight;
    const top = Math.floor(dy * height);
    return new Rectangle(
      0,
      top,
      this.ganttCanvasManager.renderCanvas!.width,
      top + height
    );
  }

  @CanvasAvailable('queue')
  private drawRowSub(
    index: number,
    rec: Rectangle,
    selectedBreak: IBreak | undefined
  ): void {
    this.ganttCanvasManager.rowCtx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!,
      0,
      0
    );

    this.ganttCanvasManager.rowCtx!.restore();

    this.drawRowBreaks(index, selectedBreak);

    if (
      this.dataManagementBreak.rows &&
      index < this.dataManagementBreak.rows
    ) {
      this.ganttCanvasManager.renderCanvasCtx!.drawImage(
        this.ganttCanvasManager.rowCanvas!,
        rec.x,
        rec.y
      );
    } else {
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.renderCanvasCtx!,
        this.gridColors.backGroundContainerColor,
        rec
      );
    }
  }

  public drawRowBreaks(index: number, selectedBreak: IBreak | undefined) {
    const breaks = this.dataManagementBreak.readData(index);
    if (breaks && Array.isArray(breaks) && breaks.length > 0) {
      const validBreaks = breaks.filter(
        (x) => x && typeof x === 'object' && x.from && x.until
      );

      const breaksWithLayers =
        this.breakLayerService.calculateOptimizedBreakLayers(validBreaks);

      breaksWithLayers.forEach((breakWithLayer, i) => {
        let drawBreak = true;

        // Überspringe selectedBreak (wird separat gezeichnet)
        if (
          selectedBreak &&
          breakWithLayer.id &&
          selectedBreak.id &&
          breakWithLayer.id === selectedBreak.id
        ) {
          drawBreak = false;
        }

        if (drawBreak) {
          try {
            const baseRec = this.calcDateRectangle(
              breakWithLayer.from as Date,
              breakWithLayer.until as Date
            );

            const adjustedRec = this.calcLayeredRectangle(
              baseRec,
              breakWithLayer.layer
            );

            const abs = this.dataManagementAbsence
              .absenceList()
              .find((as) => as && as.id === breakWithLayer.absenceId);

            if (abs && abs.color) {
              this.drawRowBreakWithLayer(
                adjustedRec,
                abs.color,
                breakWithLayer.layer
              );
            } else {
              console.log(`Break ${i}: No absence found or no color`);
            }
          } catch (error) {
            console.error(
              `Error drawing break ${i} with layer ${breakWithLayer.layer}:`,
              error
            );
          }
        }
      });
    }
  }

  private calcDateRectangle(beginDate: Date, endDate: Date): Rectangle {
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

  private drawRowBreakWithLayer(
    rec: Rectangle,
    color: string,
    layer: number
  ): void {
    if (!this.ganttCanvasManager.rowCtx!) {
      return;
    }

    // Speichere den aktuellen Kontext-Zustand
    this.ganttCanvasManager.rowCtx!.save();

    if (layer === 0) {
      // Originalbreak: volle Deckkraft
      this.ganttCanvasManager.rowCtx!.globalAlpha = 1.0;
    } else {
      // Überdeckte Breaks: leicht transparenter
      this.ganttCanvasManager.rowCtx!.globalAlpha = 0.85;
    }

    // Zeichne den Break in ursprünglicher Größe
    DrawHelper.fillRectangle(this.ganttCanvasManager.rowCtx!, color, rec);

    // Zeichne einen dünnen Rahmen für bessere Sichtbarkeit bei versetzten Breaks
    if (layer > 0) {
      this.ganttCanvasManager.rowCtx!.strokeStyle = DrawHelper.GetDarkColor(
        color,
        180
      );
      this.ganttCanvasManager.rowCtx!.lineWidth = 0.5;
      this.ganttCanvasManager.rowCtx!.strokeRect(
        rec.left,
        rec.top,
        rec.width,
        rec.height
      );
    }

    // Stelle den ursprünglichen Kontext-Zustand wieder her
    this.ganttCanvasManager.rowCtx!.restore();
  }

  public getRecommendedRowHeight(index: number): number {
    const breaks = this.dataManagementBreak.readData(index);

    if (!breaks || breaks.length === 0) {
      return this.calendarSetting.cellHeight;
    }

    const validBreaks = breaks.filter(
      (x) => x && typeof x === 'object' && x.from && x.until
    );

    return this.breakLayerService.calculateRecommendedRowHeight(
      validBreaks,
      this.calendarSetting.cellHeight
    );
  }

  private calcLayeredRectangle(baseRec: Rectangle, layer: number): Rectangle {
    if (layer === 0) {
      return baseRec;
    }

    // Versatz pro Layer: 2 Pixel nach oben oder unten
    const layerOffset = 3; // Pixel pro Layer

    // Berechne Y-Verschiebung basierend auf Layer
    // Gerade Layer (2, 4, 6...) nach unten, ungerade (1, 3, 5...) nach oben
    let yOffset: number;
    if (layer % 2 === 1) {
      // Ungerade Layer: nach oben verschieben
      const upwardLayer = Math.ceil(layer / 2);
      yOffset = -upwardLayer * layerOffset;
    } else {
      // Gerade Layer: nach unten verschieben
      const downwardLayer = layer / 2;
      yOffset = downwardLayer * layerOffset;
    }

    // Behält die ursprüngliche Größe des Breaks bei
    return new Rectangle(
      baseRec.left,
      baseRec.top + yOffset,
      baseRec.right,
      baseRec.bottom + yOffset
    );
  }
}
