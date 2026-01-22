import { WeekDay } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { HolidayDate } from 'src/app/domain/models/calendar-rule-class';
import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import {
  addDays,
  EqualDate,
  getDaysInMonth,
} from 'src/app/shared/helpers/date.helper';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import {
  CellTypeEnum,
  HeaderCellTypeEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';

@Injectable()
export class ScheduleDataService extends BaseDataService {
  public override holidayCollection = inject(HolidayCollectionService);
  protected gridSetting = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettingsService = inject(AppSettingsManagementService);

  public override rowGroupIndex: number[] = new Array<number>();
  public override indexGroupRow: number[] = new Array<number>();
  public override startDate: Date | undefined;

  private rowsNumber = 0;
  private columnsNumber = 0;

  public override setMetrics(): void {
    this.initializeDateAndColumns();
    this.initializeGroupIndices();

    this.refreshSignal.set(true);
    setTimeout(() => this.refreshSignal.set(false), 0);
  }

  public override getCell(row: number, col: number): GridCell {
    const c = new GridCell();
    const entry = this.getWorkScheduleEntryForCell(row, col);

    if (entry) {
      c.cellType = CellTypeEnum.Standard;
      c.mainText = entry.abbreviation || '';
      c.firstSubText = this.formatWorkTime(entry.changeTime);
      c.secondSubText =
        formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);
    } else {
      c.cellType = CellTypeEnum.Empty;
      c.mainText = '';
      c.firstSubText = '';
      c.secondSubText = '';
    }

    return c;
  }

  private formatWorkTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * 60);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }

  getWorkScheduleEntryForCell(
    row: number,
    col: number
  ): IScheduleCell | undefined {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return undefined;
    }

    const firstRowOfClient = this.indexGroupRow[clientIndex];
    const rowWithinClient = row - firstRowOfClient;

    const entries = this.getWorkScheduleForCell(row, col);
    if (rowWithinClient < entries.length) {
      return entries[rowWithinClient];
    }

    return undefined;
  }

  public getGroupIndex(index: number) {
    return this.dataManagementSchedule.clients[index];
  }

  public getRowHeaderSlot1Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(
      client.id
    );
    return periodHours ? `${periodHours.guaranteedHours}h` : '';
  }

  public getRowHeaderSlot2Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(
      client.id
    );
    return periodHours ? `${periodHours.hours}h` : '';
  }

  public getRowHeaderSlot3Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(
      client.id
    );
    return periodHours ? `${periodHours.surcharges}h` : '';
  }

  public override initializeDateAndColumns(): void {
    const visibleStart = this.dataManagementSchedule.visibleStartDate;
    const visibleEnd = this.dataManagementSchedule.visibleEndDate;

    if (visibleStart && visibleEnd) {
      this.startDate = new Date(visibleStart);
      const diffTime = visibleEnd.getTime() - visibleStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.columns = diffDays;
    } else {
      this.startDate = new Date();
      this.columns = 0;
    }
  }

  public override isLastGroupRow(row: number): boolean {
    const result = this.indexGroupRow.find((x) => x === row + 1);
    return result === undefined ? false : true;
  }

  public override getItemMainText(row: number, col: number): string {
    const entry = this.getWorkScheduleEntryForCell(row, col);
    return entry?.abbreviation || '';
  }

  public override isCellEditable(row: number, col: number): boolean {
    if (this.isColumnSealed(col)) {
      return false;
    }

    return !this.isCellActive(row, col);
  }

  public override columnStatus(column: number): HeaderCellTypeEnum {
    if (this.isColumnSealed(column)) {
      return HeaderCellTypeEnum.Sealed;
    }
    return HeaderCellTypeEnum.Default;
  }

  override isOverlayDay(column: number): boolean {
    const workSettings = this.appSettingsService.workSettings();
    const dayVisibleBefore = workSettings.dayVisibleBefore;
    const dayVisibleAfter = workSettings.dayVisibleAfter;
    const totalColumns = this.columns;

    if (column < dayVisibleBefore) {
      return true;
    }

    const periodDays = totalColumns - dayVisibleBefore - dayVisibleAfter;
    if (column >= dayVisibleBefore + periodDays) {
      return true;
    }

    return false;
  }
  override isColumnSealed(_column: number): boolean {
    // const dayVisibleBeforeMonth =
    //   this.dataManagementSchedule.workFilter.dayVisibleBeforeMonth;
    // if (_column < dayVisibleBeforeMonth) {
    //   return true;
    // }
    return false;
  }

  override getHeaderFontColor(column: number): string | null {
    const availableShifts = this.dataManagementSchedule.availableShiftsByDay;
    if (column >= 0 && column < availableShifts.length) {
      const shiftsForDay = availableShifts[column];
      if (shiftsForDay && shiftsForDay.length > 0) {
        return 'red';
      }
    }
    return null;
  }

  private initializeGroupIndices(): void {
    this.rowGroupIndex = [];
    this.indexGroupRow = [];
    let count = 0;
    let index = -1;

    for (
      let client = 0;
      client < this.dataManagementSchedule.clients.length;
      client++
    ) {
      if (index < count) {
        index = count;
        this.indexGroupRow.push(count);
      }

      for (
        let row = 0;
        row < this.dataManagementSchedule.clients[client].neededRows;
        row++
      ) {
        this.rowGroupIndex.push(client);
        count += 1;
      }
    }
    this.rows = count;
  }

  private set rows(value: number) {
    this.rowsNumber = value;
    this.gridScroll.maxRows = value;
  }

  override get rows(): number {
    return this.rowsNumber;
  }

  private set columns(value: number) {
    this.columnsNumber = value;
    this.gridScroll.maxCols = value;
  }

  override get columns(): number {
    return this.columnsNumber;
  }

  get indexes(): number {
    return this.indexGroupRow.length;
  }

  override getWeekday(column: number): WeekDaysEnum {
    if (this.startDate) {
      const today: Date = new Date(this.startDate);
      today.setDate(today.getDate() + column);

      if (this.holidayCollection) {
        const result = this.holidayCollection.holidays.holidayList.find(
          (x) => EqualDate(x.currentDate, today) === 0
        );

        if (result) {
          return result.officially
            ? WeekDaysEnum.OfficiallyHoliday
            : WeekDaysEnum.Holiday;
        }
      }

      if (today.getDay() === WeekDay.Sunday) {
        return WeekDaysEnum.Sunday;
      } else if (today.getDay() === WeekDay.Saturday) {
        return WeekDaysEnum.Saturday;
      } else {
        return WeekDaysEnum.Workday;
      }
    }
    return WeekDaysEnum.Workday;
  }

  override weekdayName(column: number): string {
    if (this.startDate) {
      const today: Date = new Date(this.startDate);
      today.setDate(today.getDate() + column);

      return this.gridSetting.weekday[today.getDay()];
    }

    return '';
  }

  override holidayInfo(column: number): HolidayDate | undefined {
    if (this.startDate) {
      const today = addDays(this.startDate, column);

      if (this.holidayCollection) {
        return this.holidayCollection.holidays.holidayList.find(
          (x) => EqualDate(x.currentDate, today) === 0
        );
      }
    }
    return undefined;
  }

  getWorkScheduleForCell(row: number, col: number): IScheduleCell[] {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return [];
    }

    const client = this.dataManagementSchedule.clients[clientIndex];
    if (!client || !client.id) {
      return [];
    }

    const date = this.getDateForColumn(col);
    if (!date) {
      return [];
    }

    return this.dataManagementSchedule.getWorkScheduleForClientAndDate(
      client.id,
      date
    );
  }

  getDateForColumn(col: number): Date | undefined {
    if (!this.startDate) {
      return undefined;
    }
    return addDays(this.startDate, col);
  }

  override handlePaste(
    startRow: number,
    startCol: number,
    data: string[][]
  ): void {
    for (let rowOffset = 0; rowOffset < data.length; rowOffset++) {
      const rowData = data[rowOffset];
      for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
        const abbreviation = rowData[colOffset].trim();
        if (!abbreviation) {
          continue;
        }

        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;

        if (this.isColumnSealed(targetCol)) {
          continue;
        }

        if (this.isCellActive(targetRow, targetCol)) {
          continue;
        }

        const clientIndex = this.rowGroupIndex[targetRow];
        if (clientIndex === undefined) {
          continue;
        }

        const client = this.dataManagementSchedule.clients[clientIndex];
        if (!client || !client.id) {
          continue;
        }

        const date = this.getDateForColumn(targetCol);
        if (!date) {
          continue;
        }

        const matchingShift = this.findShiftByAbbreviationAndDate(
          abbreviation,
          date
        );
        if (!matchingShift) {
          continue;
        }

        this.dataManagementSchedule.addWorkScheduleEntry({
          clientId: client.id,
          date: date,
          shiftId: matchingShift.shiftId,
          workTime: matchingShift.workTime,
          startTime: matchingShift.startShift,
          endTime: matchingShift.endShift,
        });
      }
    }
  }

  private findShiftByAbbreviationAndDate(
    abbreviation: string,
    date: Date
  ): { shiftId: string; workTime: number; startShift: string; endShift: string } | undefined {
    const upperAbbr = abbreviation.toUpperCase();
    const matchingShift = this.dataManagementSchedule.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === upperAbbr &&
        this.isSameDay(shift.date, date)
    );

    if (matchingShift) {
      return {
        shiftId: matchingShift.shiftId,
        workTime: matchingShift.workTime,
        startShift: matchingShift.startShift,
        endShift: matchingShift.endShift,
      };
    }
    return undefined;
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

  findFirstRowByShiftIdAndColumn(shiftId: string, column: number): number {
    for (let row = 0; row < this.rows; row++) {
      const entry = this.getWorkScheduleEntryForCell(row, column);
      if (entry && entry.shiftId === shiftId) {
        return row;
      }
    }
    return -1;
  }
}
