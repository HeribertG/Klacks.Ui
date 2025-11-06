import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { CalendarSettingService } from '../calendar-setting.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { daysBetweenDates, isLeapYear } from 'src/app/shared/helpers/date.helper';
import { DataManagementBreakService } from 'src/app/domain/services/absence/data-management-break.service';

@Injectable()
export class CalendarCalculationService {
  private calendarSetting = inject(CalendarSettingService);
  private scroll = inject(ScrollService);
  private holidayCollection = inject(HolidayCollectionService);
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private dataManagementBreak = inject(DataManagementBreakService);

  public startDate: Date = new Date(new Date().getFullYear(), 0, 1);

  private readonly MINCELLWITHFORDAYRANK = 20;

  public updateStartDate(year: number): void {
    this.startDate = new Date(year, 0, 1);
  }

  public calcDaysPerYear(): number {
    return isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
  }

  public getWidth(): number {
    const year = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return this.calendarSetting.cellWidth * year + 1;
  }

  public calculateDayRectangle(dayIndex: number): Rectangle {
    const d = dayIndex * this.calendarSetting.cellWidth;
    return new Rectangle(
      Math.floor(d),
      0,
      Math.floor(d + this.calendarSetting.cellWidth),
      this.calendarSetting.cellHeaderHeight
    );
  }

  public calculateHeaderDayRect(
    dayRect: Rectangle,
    isSaturday: boolean
  ): Rectangle {
    const rankTop = this.calendarSetting.cellHeight;
    const rankHeight =
      this.calendarSetting.cellHeaderHeight -
      this.calendarSetting.cellHeight;
    return new Rectangle(
      isSaturday ? dayRect.right - this.MINCELLWITHFORDAYRANK : dayRect.left,
      rankTop,
      isSaturday ? dayRect.right : dayRect.left + this.MINCELLWITHFORDAYRANK,
      rankTop + rankHeight
    );
  }

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

  public calcLayeredRectangle(baseRec: Rectangle, layer: number): Rectangle {
    if (layer === 0) {
      return baseRec;
    }

    const layerOffset = 3;

    let yOffset: number;
    if (layer % 2 === 1) {
      const upwardLayer = Math.ceil(layer / 2);
      yOffset = -upwardLayer * layerOffset;
    } else {
      const downwardLayer = layer / 2;
      yOffset = downwardLayer * layerOffset;
    }

    return new Rectangle(
      baseRec.left,
      baseRec.top + yOffset,
      baseRec.right,
      baseRec.bottom + yOffset
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

  public calcValidFromColumn(clientIndex: number): number {
    if (
      clientIndex < 0 ||
      clientIndex >= this.dataManagementBreak.clients.length
    ) {
      return -1;
    }

    const client = this.dataManagementBreak.clients[clientIndex];
    if (!client?.membership?.validFrom) {
      return -1;
    }

    const validFromDate =
      client.membership.validFrom instanceof Date
        ? client.membership.validFrom
        : new Date(client.membership.validFrom);

    if (isNaN(validFromDate.getTime())) {
      return -1;
    }

    const column = Math.floor(daysBetweenDates(this.startDate, validFromDate));

    return column >= 0 ? column : -1;
  }

  public calcValidUntilColumn(clientIndex: number): number {
    if (
      clientIndex < 0 ||
      clientIndex >= this.dataManagementBreak.clients.length
    ) {
      return -1;
    }

    const client = this.dataManagementBreak.clients[clientIndex];
    if (!client?.membership?.validUntil) {
      return -1;
    }

    const validUntilDate =
      client.membership.validUntil instanceof Date
        ? client.membership.validUntil
        : new Date(client.membership.validUntil);

    if (isNaN(validUntilDate.getTime())) {
      return -1;
    }

    const currentYear = this.startDate.getFullYear();
    const endOfDay = 1;

    if (validUntilDate.getFullYear() !== currentYear) {
      return -1;
    }

    const column =
      Math.floor(daysBetweenDates(this.startDate, validUntilDate)) + endOfDay;

    const maxColumns = isLeapYear(currentYear) ? 366 : 365;
    return column >= 0 && column < maxColumns ? column : -1;
  }

  public firstVisibleColumn(): number {
    return this.scroll.horizontalScrollPosition;
  }

  public lastVisibleColumn(): number {
    const last = this.firstVisibleColumn() + this.visibleCol();
    const max = isLeapYear(this.holidayCollection.currentYear) ? 366 : 365;
    return last < max ? last : max;
  }

  public visibleCol(): number {
    if (!this.ganttCanvasManager.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.width / this.calendarSetting.cellWidth
    );
  }

  public visibleRow(): number {
    if (!this.ganttCanvasManager.isCanvasAvailable()) {
      return 0;
    }
    return Math.ceil(
      this.ganttCanvasManager.height / this.calendarSetting.cellHeight
    );
  }

  public get firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }
}
