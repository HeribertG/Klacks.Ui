import { Injectable } from '@angular/core';
import { Rectangle } from '../../../grid/classes/geometry';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { CalendarHeaderDayRank } from 'src/app/core/absence-class';
import { HolidayCollectionService } from '../../../grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { GridColorService } from '../../../grid/services/grid-color.service';
import { GridFontsService } from '../../../grid/services/grid-fonts.service';
import { TranslateService } from '@ngx-translate/core';
import { ScrollService } from './scroll.service';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
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
} from '../../../grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from '../../../grid/enums/gradient-3d-border-style';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { IBreak } from 'src/app/core/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';

@Injectable()
export class RenderCalendarGridService {
  public startDate: Date = new Date(new Date().getFullYear(), 0, 1);
  private readonly SUNDAY = 0;
  private readonly SATURDAY = 6;
  private readonly MINCELLWITHFORDAYRANK = 20;

  constructor(
    private ganttCanvasManager: GanttCanvasManagerService,
    private gridColors: GridColorService,
    private holidayCollection: HolidayCollectionService,
    private calendarSetting: CalendarSettingService,
    private gridSetting: GridSettingsService,
    private gridFonts: GridFontsService,
    private dataManagementBreak: DataManagementBreakService,
    private dataManagementAbsence: DataManagementAbsenceGanttService,
    private translateService: TranslateService,
    private scroll: ScrollService
  ) {}

  public renderRuler(): void {
    this.startDate = new Date(this.holidayCollection.currentYear, 0, 1);

    let headerDayRank = new Array<CalendarHeaderDayRank>();
    let monthsRect = new Array<Rectangle>();

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

    for (let i = 0; i < this.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      this.drawRow(posDelta, undefined);
    }
  }

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  private calcDaysPerYear(): number {
    const startDate = new Date(this.holidayCollection.currentYear, 0, 1);
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

  private visibleRow(): number {
    if (!this.ganttCanvasManager.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.height / this.calendarSetting.cellHeight
    );
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
    if (breaks) {
      breaks.forEach((x) => {
        let drawBreak = true;
        if (selectedBreak && x.id === selectedBreak.id) {
          drawBreak = false;
        }
        if (drawBreak) {
          const rec = this.calcDateRectangle(x.from as Date, x.until as Date);
          const abs = this.dataManagementAbsence.absenceList.find(
            (as) => as.id === x.absenceId
          );
          if (abs && abs.color) {
            this.drawRowBreak(rec, abs.color);
          }
        }
      });
    }
  }

  private drawRowBreak(rec: Rectangle, color: string) {
    if (!this.ganttCanvasManager.rowCtx!) {
      return;
    }

    DrawHelper.fillRectangle(this.ganttCanvasManager.rowCtx!, color, rec);
  }

  private calcDateRectangle(beginDate: Date, endDate: Date): Rectangle {
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
}
