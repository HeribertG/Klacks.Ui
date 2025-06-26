import { WeekDay } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import {
  addDays,
  EqualDate,
  getDaysInMonth,
} from 'src/app/helpers/format-helper';
import { GridCell } from 'src/app/shared/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/shared/grid/enums/cell-settings.enum';
import { WeekDaysEnum } from 'src/app/shared/grid/enums/divers';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { GridSettingsService } from 'src/app/shared/grid/services/grid-settings.service';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';

@Injectable({
  providedIn: 'root',
})
export class ScheduleDataService extends BaseDataService {
  public override holidayCollection = inject(HolidayCollectionService);
  protected gridSetting = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);

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

    c.mainText = 'Zelle ' + (row * this.columns + col).toString();
    c.firstSubText = row.toString() + ' / ' + col.toString();
    c.cellType = CellTypeEnum.Standard;
    c.secondSubText = 'Lorem ipsum dolor sit amet';

    return c;
  }

  public getGroupIndex(index: number) {
    return this.dataManagementSchedule.clients[index];
  }
  public override initializeDateAndColumns(): void {
    const dayVisibleBeforeMonth =
      this.dataManagementSchedule.workFilter.dayVisibleBeforeMonth;
    const dayVisibleAfterMonth =
      this.dataManagementSchedule.workFilter.dayVisibleAfterMonth;
    const currentYear = this.dataManagementSchedule.workFilter.currentYear;
    const currentMonth = this.dataManagementSchedule.workFilter.currentMonth;

    this.startDate = new Date(currentYear, currentMonth, 1);
    this.startDate = addDays(this.startDate, -1 * dayVisibleBeforeMonth);
    this.columns =
      getDaysInMonth(currentYear, currentMonth) +
      dayVisibleBeforeMonth +
      dayVisibleAfterMonth;
  }

  public override isLastGroupRow(row: number): boolean {
    const result = this.indexGroupRow.find((x) => x === row + 1);
    return result === undefined ? false : true;
  }

  public override getItemMainText(row: number, col: number): string {
    return 'Zelle ' + (row * this.columns + col).toString();
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
}
