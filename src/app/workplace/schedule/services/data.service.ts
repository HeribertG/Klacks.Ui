import { WeekDay } from '@angular/common';
import { Injectable } from '@angular/core';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { IClientWork } from 'src/app/core/schedule-class';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { GridCell } from 'src/app/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/grid/enums/cell-settings.enum';
import { WeekDaysEnum } from 'src/app/grid/enums/divers';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import {
  EqualDate,
  addDays,
  getDaysInMonth,
} from 'src/app/helpers/format-helper';
import { ScrollService } from './scroll.service';
import { Subject } from 'rxjs';

@Injectable()
export class DataService {
  public refreshEvent = new Subject<boolean>();

  public rowEmployeeIndex: Array<number> = new Array<number>();
  public indexEmployeeRow: Array<number> = new Array<number>();
  public startDate: Date | undefined = undefined;

  private rowsNumber = 0;
  private columnsNumber = 0;

  constructor(
    public dataManagementSchedule: DataManagementScheduleService,
    public holidayCollection: HolidayCollectionService,
    private gridSetting: GridSettingsService,
    private gridScroll: ScrollService
  ) {}

  setMetrics(): void {
    this.initializeDateAndColumns();
    this.initializeEmployeeIndices();

    this.refreshEvent.next(true);
  }

  getIndex(index: number): IClientWork {
    return this.dataManagementSchedule.clients[index];
  }
  getCell(row: number, col: number): GridCell {
    const c = new GridCell();

    c.mainText = 'Zelle ' + (row * this.columns + col).toString();
    c.firstSubText = row.toString() + ' / ' + col.toString();
    c.cellType = CellTypeEnum.Standard;
    c.secondSubText = 'Lorem ipsum dolor sit amet';

    return c;
  }

  isLastRow(row: number): boolean {
    const result = this.indexEmployeeRow.find((x) => x === row + 1);
    return result === undefined ? false : true;
  }

  getItemMainText(row: number, col: number): string {
    return 'Zelle ' + (row * this.columns + col).toString();
  }

  private set rows(value: number) {
    this.rowsNumber = value;
    this.gridScroll.maxRows = value;
  }
  get rows(): number {
    return this.rowsNumber;
  }

  get indexes(): number {
    return this.indexEmployeeRow.length;
  }

  private set columns(value: number) {
    this.columnsNumber = value;
    this.gridScroll.maxCols = value;
  }

  get columns(): number {
    return this.columnsNumber;
  }

  getWeekday(column: number): WeekDaysEnum {
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

  weekdayName(column: number): string {
    if (this.startDate) {
      const today: Date = new Date(this.startDate);
      today.setDate(today.getDate() + column);

      return this.gridSetting.weekday[today.getDay()];
    }

    return '';
  }

  holidayInfo(column: number): HolidayDate | undefined {
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

  private initializeDateAndColumns(): void {
    const dayVisibleBeforeMonth =
      this.dataManagementSchedule.workFilter.dayVisibleBeforeMonth;
    const dayVisibleAfterMonth =
      this.dataManagementSchedule.workFilter.dayVisibleAfterMonth;
    const currentYear = this.dataManagementSchedule.workFilter.currentYear;
    const currentMonth = this.dataManagementSchedule.workFilter.currentMonth;
    this.startDate = new Date(currentYear + '/' + currentMonth + '/' + 1);
    this.startDate = addDays(this.startDate, -1 * dayVisibleBeforeMonth);
    this.columns = getDaysInMonth(currentYear, currentMonth - 1);
    this.columns += dayVisibleBeforeMonth + dayVisibleAfterMonth;
  }

  private initializeEmployeeIndices(): void {
    this.rowEmployeeIndex = [];
    this.indexEmployeeRow = [];
    let count = 0;
    let index = -1;

    for (
      let client = 0;
      client < this.dataManagementSchedule.clients.length;
      client++
    ) {
      if (index < count) {
        index = count;
        this.indexEmployeeRow.push(count);
      }

      for (
        let row = 0;
        row < this.dataManagementSchedule.clients[client].neededRows;
        row++
      ) {
        this.rowEmployeeIndex.push(client);
        count += 1;
      }
    }
    this.rows = count;
  }
}
