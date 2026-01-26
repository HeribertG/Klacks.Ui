import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CalendarHeaderDayRank } from 'src/app/domain/models/absence-class';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';
import { IBreakPlaceholder } from 'src/app/domain/models/break-class';
import { CalendarCalculationService } from './calendar-calculation.service';
import { CalendarDayRenderingService } from './calendar-day-rendering.service';
import { CalendarMonthRenderingService } from './calendar-month-rendering.service';
import { CalendarHeaderRenderingService } from './calendar-header-rendering.service';
import { ValidityPeriodRenderingService } from './validity-period-rendering.service';
import { BreakRenderingService } from './break-rendering.service';
import { RowSelectionService } from './row-selection.service';

@Injectable()
export class RenderCalendarGridService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private calendarSetting = inject(CalendarSettingService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private scroll = inject(ScrollService);

  private calculationService = inject(CalendarCalculationService);
  private dayRenderingService = inject(CalendarDayRenderingService);
  private monthRenderingService = inject(CalendarMonthRenderingService);
  private headerRenderingService = inject(CalendarHeaderRenderingService);
  private validityPeriodRenderingService = inject(ValidityPeriodRenderingService);
  private breakRenderingService = inject(BreakRenderingService);
  private selectionService = inject(RowSelectionService);

  public get startDate(): Date {
    return this.calculationService.startDate;
  }

  public get selectedBreakRec(): Rectangle | undefined {
    return this.selectionService.selectedBreakRec;
  }

  public set selectedBreakRec(value: Rectangle | undefined) {
    this.selectionService.selectedBreakRec = value;
  }

  public selectedBreak_dummy: IBreakPlaceholder | undefined;

  public isCanvasAvailable(): boolean {
    return this.ganttCanvasManager.isCanvasAvailable();
  }

  public updateStartDate(year: number): void {
    this.calculationService.updateStartDate(year);
  }

  @CanvasAvailable('queue')
  public renderRuler(): void {
    this.calculationService.updateStartDate(this.calculationService.startDate.getFullYear());

    const headerDayRank = new Array<CalendarHeaderDayRank>();
    const monthsRect = new Array<Rectangle>();

    const daysPerYear = this.calculationService.calcDaysPerYear();
    this.sizeCanvas(this.calculationService.getWidth());
    this.drawDaysBorderlineOnRuler(daysPerYear, headerDayRank, monthsRect);
    this.monthRenderingService.drawMonthBorder(monthsRect);
    this.headerRenderingService.copyRulerOnHeadline();
    this.headerRenderingService.drawWeekendDayNumberOnHeadline(headerDayRank);
    this.monthRenderingService.drawMonthBarOnHeadline();
  }

  @CanvasAvailable('queue')
  public renderCalendar(): void {
    this.ganttCanvasManager.renderCanvas!.height =
      this.ganttCanvasManager.height;
    this.ganttCanvasManager.renderCanvas!.width = this.calculationService.getWidth();

    const rowsToRender = [];
    for (let i = 0; i < this.calculationService.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      rowsToRender.push(posDelta);
    }

    for (let i = 0; i < this.calculationService.visibleRow() + 1; i++) {
      const posDelta = i + this.scroll.verticalScrollPosition!;
      this.drawRow(posDelta, undefined);
    }
  }

  public moveGridVertical(directionY: number): void {
    const SAFETY_MARGIN = 3;
    const visibleRows = this.calculationService.visibleRow();
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
              const rowRect = this.calculationService.calcRowRec(
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
              const rowRect = this.calculationService.calcRowRec(
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

  public get selectedBreak(): IBreakPlaceholder | undefined {
    return this.selectionService.selectedBreak;
  }

  public set selectedRow(value: number) {
    if (this.selectionService.selectedRow !== value) {
      this.unDrawSelectionRow();
      this.selectionService.selectedRow = value;
      this.drawSelectionRow();
    }
  }

  public get selectedRow(): number {
    return this.selectionService.selectedRow;
  }

  public get firstVisibleRow(): number {
    return this.calculationService.firstVisibleRow;
  }

  public drawSelectionRow(): void {
    this.selectionService.drawSelectionRow();
  }

  public unDrawSelectionRow(): void {
    if (this.selectedRow > -1) {
      if (this.selectionService.isSelectedRowVisible()) {
        this.drawRowIntern(this.selectedRow, true);
        this.drawRow(this.selectedRow, undefined);
      }
    }
  }

  public drawSelectedBreak(): void {
    this.selectionService.drawSelectedBreak();
  }

  public isSelectedRowVisible(): boolean {
    return this.selectionService.isSelectedRowVisible();
  }

  public set selectedBreakIndex(value: number) {
    this.selectionService.selectedBreakIndex = value;
    this.unDrawSelectionRow();
    this.drawSelectionRow();
    this.drawSelectedBreak();
  }

  public get selectedBreakIndex() {
    return this.selectionService.selectedBreakIndex;
  }

  public calcRowRec(
    index: number,
    verticalScrollPosition: number,
    cellHeight: number
  ): Rectangle {
    return this.calculationService.calcRowRec(index, verticalScrollPosition, cellHeight);
  }

  public calcLeftAnchorRectangle(rec: Rectangle): Rectangle {
    return this.calculationService.calcLeftAnchorRectangle(rec);
  }

  public calcRightAnchorRectangle(rec: Rectangle): Rectangle {
    return this.calculationService.calcRightAnchorRectangle(rec);
  }

  public drawRowIntern(index: number, isUnselect = false): void {
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

    this.drawRowSubIntern(index, rowRec, isUnselect);
  }

  firstVisibleColumn(): number {
    return this.calculationService.firstVisibleColumn();
  }

  public lastVisibleColumn(): number {
    return this.calculationService.lastVisibleColumn();
  }

  public visibleCol(): number {
    return this.calculationService.visibleCol();
  }

  public visibleRow(): number {
    return this.calculationService.visibleRow();
  }

  public checkSelectedRowVisibility(): void {
    this.selectionService.checkSelectedRowVisibility();
  }

  public isSelectedBreak_Dirty(): boolean {
    return this.selectionService.isSelectedBreak_Dirty();
  }

  private drawRowSubIntern(
    index: number,
    rowRec: Rectangle,
    isUnselect: boolean
  ): void {
    if (index < this.dataManagementBreak.rows) {
      this.ganttCanvasManager.rowCtx!.drawImage(
        this.ganttCanvasManager.backgroundRowCanvas!,
        0,
        0
      );

      this.validityPeriodRenderingService.drawPreValidFromGrayRectangle(index);
      this.validityPeriodRenderingService.drawPostValidUntilGrayRectangle(index);

      if (isUnselect) {
        this.breakRenderingService.drawRowBreaks(index, undefined);
      } else {
        this.breakRenderingService.drawRowBreaks(index, this.selectedBreak);
      }

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

  @CanvasAvailable('queue')
  private sizeCanvas(maxWidth: number): void {
    this.ganttCanvasManager.resizeBackgroundRowCanvas(maxWidth);
    this.ganttCanvasManager.resizeRowCanvas(maxWidth);
    this.ganttCanvasManager.resizeHeaderCanvas(maxWidth);
  }

  drawDaysBorderlineOnRuler(
    daysPerYear: number,
    headerDayRank: CalendarHeaderDayRank[],
    monthsRect: Rectangle[]
  ) {
    this.monthRenderingService.drawMonthBackgrounds(monthsRect);
    this.dayRenderingService.drawDayBackgrounds(daysPerYear, headerDayRank);
  }

  @CanvasAvailable('queue')
  public drawRow(index: number, selectedBreak: IBreakPlaceholder | undefined): void {
    const rec = this.calculationService.calcRowRec(
      index,
      this.scroll.verticalScrollPosition,
      this.calendarSetting.cellHeight
    );

    this.drawRowSub(index, rec, selectedBreak);
  }

  @CanvasAvailable('queue')
  private drawRowSub(
    index: number,
    rec: Rectangle,
    selectedBreak: IBreakPlaceholder | undefined
  ): void {
    this.ganttCanvasManager.rowCtx!.drawImage(
      this.ganttCanvasManager.backgroundRowCanvas!,
      0,
      0
    );

    this.ganttCanvasManager.rowCtx!.restore();

    this.validityPeriodRenderingService.drawPreValidFromGrayRectangle(index);
    this.validityPeriodRenderingService.drawPostValidUntilGrayRectangle(index);

    this.breakRenderingService.drawRowBreaks(index, selectedBreak);

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

  public getRecommendedRowHeight(index: number): number {
    return this.breakRenderingService.getRecommendedRowHeight(
      index,
      this.calendarSetting.cellHeight
    );
  }
}
