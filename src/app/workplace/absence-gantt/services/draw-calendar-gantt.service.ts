import { Injectable } from '@angular/core';
import { Rectangle } from '../../../grid/classes/geometry';
import {
  EqualDate,
  addDays,
  daysBetweenDates,
  getDaysInMonth,
  isLeapYear,
} from 'src/app/helpers/format-helper';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Break, IBreak } from 'src/app/core/break-class';
import { Gradient3DBorderStyleEnum } from '../../../grid/enums/gradient-3d-border-style';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from '../../../grid/enums/cell-settings.enum';
import { CalendarHeaderDayRank } from 'src/app/core/absence-class';
import { HolidayCollectionService } from '../../../grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { GridColorService } from '../../../grid/services/grid-color.service';
import { GridFontsService } from '../../../grid/services/grid-fonts.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { TranslateService } from '@ngx-translate/core';
import { ScrollService } from './scroll.service';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { MyPosition } from 'src/app/grid/classes/position';
import { Subject } from 'rxjs';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';

@Injectable()
export class DrawCalendarGanttService {
  public vScrollbarRefreshEvent = new Subject<boolean>();
  public hScrollbarRefreshEvent = new Subject<boolean>();

  public pixelRatio = 1;
  public startDate: Date = new Date();
  public selectedBreakRec: Rectangle | undefined;
  public selectedBreak_dummy: IBreak | undefined;

  private _columns: number = 365;
  private _selectedRow = -1;
  private _vScrollbarValue = -1;
  private _hScrollbarValue = -1;
  private _selectedBreakIndex = -1;
  private readonly SUNDAY = 0;
  private readonly SATURDAY = 6;
  private _isFocused = false;
  private _dragRow = -1;

  constructor(
    public ganttCanvasManager: GanttCanvasManagerService,
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

  /* #region   create */
  public createRuler(): void {
    let headerDayRank = new Array<CalendarHeaderDayRank>();
    let monthsRect = new Array<Rectangle>();

    const year = this.initDate();
    this.initCanvas(this.getWidth());
    this.setBackgroundColor();
    this.drawDayOnRuler(year, headerDayRank, monthsRect);
    this.drawMonthBorderlineOnRuler(monthsRect);
    this.copyRulerOnHeadline();
    this.drawWeekendDayNumberOnHeadline(headerDayRank);
    this.drawMonthBarOnHeadline();
    this.ganttCanvasManager.ctx!.drawImage(
      this.ganttCanvasManager.headerCanvas!,
      0,
      0
    );
  }

  private initDate(): number {
    this.startDate = new Date(this.holidayCollection.currentYear, 0, 1);
    return isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
  }

  private initCanvas(maxWidth: number): void {
    if (
      !this.ganttCanvasManager.backgroundRowCanvas ||
      !this.ganttCanvasManager.headerCanvas ||
      !this.ganttCanvasManager.rowCanvas
    ) {
      throw new Error('Canvas is not initialized.');
    }

    const cellHeight = this.calendarSetting.cellHeight;
    this.ganttCanvasManager.backgroundRowCanvas.height = cellHeight;
    this.ganttCanvasManager.rowCanvas.height = cellHeight;
    const headerHeight = this.calendarSetting.cellHeaderHeight;
    this.ganttCanvasManager.headerCanvas.height = headerHeight;

    this.ganttCanvasManager.backgroundRowCanvas.width = maxWidth;
    this.ganttCanvasManager.rowCanvas.width =
      this.ganttCanvasManager.backgroundRowCanvas.width;
    this.ganttCanvasManager.headerCanvas.width = maxWidth;
  }

  private setBackgroundColor() {
    if (
      !this.ganttCanvasManager.backgroundRowCanvas ||
      !this.ganttCanvasManager.backgroundRowCtx
    ) {
      throw new Error(
        "CanvasRenderingContext2D and Canvas are'nt initialized."
      );
    }
    const rec = new Rectangle(
      0,
      0,
      this.ganttCanvasManager.backgroundRowCanvas.width,
      this.ganttCanvasManager.backgroundRowCanvas.height
    );
    DrawHelper.fillRectangle(
      this.ganttCanvasManager.backgroundRowCtx,
      this.gridColors.controlBackGroundColor,
      rec
    );
  }

  private drawDayOnRuler(
    year: number,
    headerDayRank: CalendarHeaderDayRank[],
    monthsRect: Rectangle[]
  ) {
    if (
      !this.ganttCanvasManager.backgroundRowCanvas! ||
      !this.ganttCanvasManager.backgroundRowCanvas! ||
      !this.ganttCanvasManager.backgroundRowCtx!
    ) {
      throw new Error(
        "CanvasRenderingContext2D and Canvas are'nt initialized."
      );
    }

    let lastDays = 0;
    const LINEWIDTH = 0.5;
    const MINCELLWITHFORDAYNUMBER = 20;
    // durchläuft alle Monate im Jahr und zeichnet die Hintergrundsfarbe pro Monat
    for (let i = 0; i < 12; i++) {
      const actualDays = getDaysInMonth(year, i);

      const leftDayCell = lastDays * this.calendarSetting.cellWidth;
      const sizeDayCell = actualDays * this.calendarSetting.cellWidth;

      const rec1 = new Rectangle(
        leftDayCell,
        0,
        leftDayCell + sizeDayCell,
        this.ganttCanvasManager.backgroundRowCanvas!.height
      );
      lastDays += actualDays;

      DrawHelper.fillRectangle(
        this.ganttCanvasManager.backgroundRowCtx!,
        i % 2 === 0
          ? this.gridColors.evenMonthColor
          : this.gridColors.oddMonthColor,
        rec1
      );

      monthsRect.push(rec1);
    }

    for (let i = 0; i < year; i++) {
      const currDate = addDays(this.startDate, i);
      const d = i * this.calendarSetting.cellWidth;
      const rec2 = new Rectangle(
        Math.floor(d),
        0,
        Math.floor(d + this.calendarSetting.cellWidth),
        this.calendarSetting.cellHeaderHeight
      );

      let isHoliday = false;
      if (
        this.holidayCollection.holidays &&
        this.holidayCollection.holidays.holidayList.length > 0
      ) {
        const result = this.holidayCollection.holidays.holidayList.find(
          (x) => EqualDate(x.currentDate, currDate) === 0
        );

        if (result) {
          isHoliday = true;
          DrawHelper.fillRectangle(
            this.ganttCanvasManager.backgroundRowCtx!,
            result.officially
              ? this.gridColors.backGroundColorOfficiallyHoliday
              : this.gridColors.backGroundColorHolyday,
            rec2
          );

          DrawHelper.drawBaseBorder(
            this.ganttCanvasManager.backgroundRowCtx!,
            this.gridColors.borderColor,
            this.calendarSetting.increaseBorder,
            rec2
          );
        }
      }

      const borderSize = this.calendarSetting.increaseBorder;
      switch (currDate.getDay()) {
        case this.SUNDAY:
          if (!isHoliday) {
            DrawHelper.fillRectangle(
              this.ganttCanvasManager.backgroundRowCtx!,
              this.gridColors.backGroundColorSunday,
              rec2
            );

            DrawHelper.drawBaseBorder(
              this.ganttCanvasManager.backgroundRowCtx!,
              this.gridColors.borderColor,
              this.calendarSetting.increaseBorder,
              rec2
            );
          }

          const c = new CalendarHeaderDayRank();
          c.name = currDate.getDate().toString();
          c.rect = new Rectangle(
            d,
            this.ganttCanvasManager.backgroundRowCanvas!.height + borderSize,
            d + MINCELLWITHFORDAYNUMBER,
            this.ganttCanvasManager.backgroundRowCanvas!.height +
              (this.ganttCanvasManager.backgroundRowCanvas!.height -
                this.ganttCanvasManager.backgroundRowCanvas!.height)
          );
          c.backColor = this.gridColors.backGroundColorSunday;

          headerDayRank.push(c);

          break;
        case this.SATURDAY:
          if (!isHoliday) {
            DrawHelper.fillRectangle(
              this.ganttCanvasManager.backgroundRowCtx!,
              this.gridColors.backGroundColorSaturday,
              rec2
            );

            DrawHelper.drawBaseBorder(
              this.ganttCanvasManager.backgroundRowCtx!,
              this.gridColors.borderColor,
              this.calendarSetting.increaseBorder,
              rec2
            );
          }

          const c1 = new CalendarHeaderDayRank();
          c1.name = currDate.getDate().toString();
          c1.rect = new Rectangle(
            rec2.right - MINCELLWITHFORDAYNUMBER,
            this.ganttCanvasManager.backgroundRowCanvas!.height + borderSize,
            rec2.right,
            this.ganttCanvasManager.backgroundRowCanvas!.height +
              (this.ganttCanvasManager.backgroundRowCanvas!.height -
                this.ganttCanvasManager.backgroundRowCanvas!.height)
          );
          c1.backColor = this.gridColors.backGroundColorSaturday;

          headerDayRank.push(c1);

          break;
        default:
          DrawHelper.drawBaseBorder(
            this.ganttCanvasManager.backgroundRowCtx!,
            this.gridColors.borderColor,
            LINEWIDTH,
            rec2
          );
      }
    }
  }

  private drawMonthBorderlineOnRuler(monthsRect: Rectangle[]) {
    if (!this.ganttCanvasManager.backgroundRowCtx!) {
      throw new Error("CanvasRenderingContext2D are'nt initialized.");
    }
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
    if (
      !this.ganttCanvasManager.headerCtx! ||
      !this.ganttCanvasManager.backgroundRowCanvas!
    ) {
      throw new Error(
        "CanvasRenderingContext2D and Canvas are'nt initialized."
      );
    }
    this.ganttCanvasManager.headerCtx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!,
      0,
      this.ganttCanvasManager.backgroundRowCanvas!.height
    );
  }

  private drawWeekendDayNumberOnHeadline(
    headerDayRank: CalendarHeaderDayRank[]
  ) {
    const MINCELLWITHFORDAYNUMBER = 20;
    //Zeichne Monatstage am Samstag und Sonntag
    if (this.calendarSetting.cellWidth * 2 >= MINCELLWITHFORDAYNUMBER) {
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

  private drawMonthBarOnHeadline() {
    if (
      !this.ganttCanvasManager.headerCtx! ||
      !this.ganttCanvasManager.backgroundRowCanvas!
    ) {
      throw new Error(
        "CanvasRenderingContext2D and Canvas are'nt initialized."
      );
    }
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
      const rec3 = new Rectangle(
        leftMonthCell,
        0,
        leftMonthCell + sizeMonthCell,
        this.ganttCanvasManager.backgroundRowCanvas!.height
      );
      lastDays += actualDays;
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.headerCtx!,
        this.gridColors.controlBackGroundColor,
        rec3
      );

      DrawHelper.drawText(
        this.ganttCanvasManager.headerCtx!,
        this.translateService.instant(this.gridSetting.monthsName[i]),
        rec3.left,
        rec3.top,
        rec3.width,
        rec3.height,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.mainFontColor,
        TextAlignmentEnum.Center,
        BaselineAlignmentEnum.Center
      );

      DrawHelper.drawBorder(
        this.ganttCanvasManager.headerCtx!,
        rec3.left,
        rec3.top,
        rec3.width,
        rec3.height,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );
    }
  }
  /* #endregion   create */

  /* #region  render */

  public renderRowHeader(): void {
    if (
      !this.ganttCanvasManager.rowHeaderRenderCanvas ||
      !this.ganttCanvasManager.rowHeaderRenderCanvasCtx
    ) {
      return;
    }
    this.ganttCanvasManager.rowHeaderRenderCanvas.height =
      this.ganttCanvasManager.height;
    this.ganttCanvasManager.rowHeaderRenderCanvas.width =
      this.ganttCanvasManager.width;

    this.ganttCanvasManager.rowHeaderRenderCanvasCtx.clearRect(
      0,
      0,
      this.ganttCanvasManager.rowHeaderRenderCanvas.width,
      this.ganttCanvasManager.rowHeaderRenderCanvas.height
    );

    for (let i = 0; i < this.scroll.visibleRows + 1; i++) {
      this.drawName(i + this.scroll.verticalScrollPosition!, true);
    }
  }

  renderCalendar(): void {
    if (!this.ganttCanvasManager.renderCanvas) {
      return;
    }

    this.ganttCanvasManager.renderCanvas.height =
      this.ganttCanvasManager.height;
    this.ganttCanvasManager.renderCanvas.width = this.getWidth();

    for (let i = 0; i < this.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      this.drawRow(posDelta, this.selectedBreak);
    }
  }

  /* #endregion  render */

  /* #region   draw */

  public drawRow(index: number, selectedBreak: IBreak | undefined): void {
    if (
      !this.ganttCanvasManager.backgroundRowCanvas! ||
      !this.ganttCanvasManager.rowCanvas! ||
      !this.ganttCanvasManager.backgroundRowCanvas! ||
      !this.ganttCanvasManager.backgroundRowCtx! ||
      !this.ganttCanvasManager.rowCtx! ||
      !this.ganttCanvasManager.headerCtx!
    ) {
      return;
    }

    if (!DrawHelper.isCanvasReady(this.ganttCanvasManager.renderCanvas!)) {
      return;
    }
    const rec = this.calcRowRec(
      index,
      this.scroll.verticalScrollPosition,
      this.calendarSetting.cellHeight
    );

    this.drawRowSub(index, rec, selectedBreak);
  }
  private drawRowSub(
    index: number,
    rec: Rectangle,
    selectedBreak: IBreak | undefined
  ): void {
    if (
      !this.ganttCanvasManager.renderCanvasCtx! ||
      !this.ganttCanvasManager.rowCtx! ||
      !this.ganttCanvasManager.backgroundRowCanvas! ||
      !this.ganttCanvasManager.rowCanvas!
    ) {
      return;
    }

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
      let index = 0;
      breaks.forEach((x) => {
        let drawBreak = true;
        const tmpBreak = selectedBreak;
        if (tmpBreak && x.id === tmpBreak.id) {
          drawBreak = false;
        }
        if (drawBreak) {
          const rec = this.calcDateRectangle(x.from as Date, x.until as Date);
          const abs = this.dataManagementAbsence.absenceList.find(
            (as) => as.id === x.absenceId
          );
          if (abs && abs.color) {
            this.drawRowBreak(rec, abs.color);
            index++;
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
    // DrawHelper.drawBorder(
    //   this.ganttCanvasManager.rowCtx!!,
    //   rec.left,
    //   rec.top,
    //   rec.width,
    //   rec.bottom,
    //   color,
    //   3
    // );
  }

  public drawName(index: number, directionDown: boolean): void {
    if (
      !this.ganttCanvasManager.rowHeaderRenderCanvas! ||
      !this.ganttCanvasManager.rowHeaderRenderCanvasCtx!
    ) {
      return;
    }

    const dy = index - this.scroll.verticalScrollPosition;
    const height = this.calendarSetting.cellHeight;
    const top = Math.floor(dy * height);
    const rec = new Rectangle(
      0,
      top,
      this.ganttCanvasManager.rowHeaderRenderCanvas!.width,
      top + height
    );

    if (index < this.dataManagementBreak.rows) {
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.rowHeaderRenderCanvasCtx!!,
        this.gridColors.controlBackGroundColor,
        rec
      );

      const diff = directionDown ? 0 : this.calendarSetting.borderWidth;
      const diff1 = !directionDown ? this.calendarSetting.borderWidth : 0;
      DrawHelper.drawBorder(
        this.ganttCanvasManager.rowHeaderRenderCanvasCtx!,
        rec.left,
        rec.top,
        rec.width,
        rec.top + rec.height - diff - 1,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );

      DrawHelper.drawText(
        this.ganttCanvasManager.rowHeaderRenderCanvasCtx!,
        this.dataManagementBreak.readClientName(index),
        rec.left,
        rec.top,
        rec.width,
        rec.height - 2,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.foreGroundColor,
        TextAlignmentEnum.Left,
        BaselineAlignmentEnum.Center
      );
    } else {
      DrawHelper.fillRectangle(
        this.ganttCanvasManager.rowHeaderRenderCanvasCtx!!,
        this.gridColors.backGroundContainerColor,
        rec
      );
    }
  }

  drawCalendar(): void {
    if (
      !DrawHelper.isCanvasReady(this.ganttCanvasManager.backgroundRowCanvas!)
    ) {
      return;
    }

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
    this.ganttCanvasManager.ctx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!!,
      dx,
      0
    );
    this.ganttCanvasManager.ctx!.drawImage(
      this.ganttCanvasManager.renderCanvas!!,
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

  public resetAll(): void {
    if (this.ganttCanvasManager.canvas) {
      this.ganttCanvasManager.height = this.ganttCanvasManager.height;
      this.ganttCanvasManager.width = this.ganttCanvasManager.width;
      this.setMetrics();
      this.createRuler();
      this.renderCalendar();
      this.drawCalendar();
    }
  }

  /* #endregion   init */

  /* #region   calc */

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
    if (!this.calendarSetting) {
      return false;
    }
    if (!this.ganttCanvasManager.canvas) {
      return false;
    }
    if (
      !(
        this.ganttCanvasManager.canvas!.clientHeight ||
        this.ganttCanvasManager.canvas!.clientWidth
      )
    ) {
      return false;
    }
    return true;
  }

  public setMetrics(): void {
    if (!this.isCanvasAvailable()) {
      return;
    }

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
    this.scroll.setMetrics(
      visibleCols,
      this._columns,
      visibleRows,
      this.dataManagementBreak.rows
    );

    this.vScrollbarRefreshEvent.next(true);
    this.hScrollbarRefreshEvent.next(true);
  }

  private getWidth(): number {
    const year = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return this.calendarSetting.cellWidth * year + 1;
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
