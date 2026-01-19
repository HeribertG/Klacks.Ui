/* eslint-disable @typescript-eslint/no-unused-vars */
import { WeekDay } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ShiftSporadic } from 'src/app/domain/enums/shift-sporadic.enum';
import { ShiftDragData } from 'src/app/presentation/workplace/schedule/services/shift-to-schedule-drag-drop.service';
import { HolidayDate } from 'src/app/domain/models/calendar-rule-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import {
  addDays,
  EqualDate,
} from 'src/app/shared/helpers/date.helper';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { transformNumberToOwnTime } from 'src/app/domain/helpers/own-time.helper';
import { CellBadge } from 'src/app/presentation/shared/grid/classes/cell-badge';
import { CellIcon } from 'src/app/presentation/shared/grid/classes/cell-icon';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import {
  CellTypeEnum,
  HeaderCellTypeEnum,
  IconCornerEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';

const IN_CONTAINER_ICON = 'pp-icon-in-container';

interface DayInfo {
  isInTemplateContainer: boolean;
  sumEmployees: number;
  quantity: number;
  sporadicScope: ShiftSporadic;
  engaged: number;
}

interface ShiftRow {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  activeDays: Map<string, DayInfo>;
  isSporadic: boolean;
  isTimeRange: boolean;
  shiftType: number;
}

@Injectable()
export class ShiftDataService extends BaseDataService {
  public override holidayCollection = inject(HolidayCollectionService);
  protected gridSetting = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettingsService = inject(AppSettingsManagementService);
  private workNotificationService = inject(WorkNotificationService);

  public override rowGroupIndex: number[] = new Array<number>();
  public override indexGroupRow: number[] = new Array<number>();
  public override startDate: Date | undefined;

  private rowsNumber = 0;
  private columnsNumber = 0;
  private shiftRows: ShiftRow[] = [];

  public override setMetrics(): void {
    this.initializeDateAndColumns();
    this.initializeShiftRows();

    this.refreshSignal.set(true);
    setTimeout(() => this.refreshSignal.set(false), 0);
  }

  public override getCell(row: number, col: number): GridCell {
    const c = new GridCell();

    if (row < this.shiftRows.length) {
      const shiftRow = this.shiftRows[row];
      const dateKey = this.getDateKeyForColumn(col);
      const dayInfo = shiftRow.activeDays.get(dateKey);

      if (dayInfo) {
        c.mainText = shiftRow.abbreviation;
        c.firstSubText = `${formatTime(shiftRow.startShift)} - ${formatTime(
          shiftRow.endShift
        )}`;
        c.cellType = CellTypeEnum.Standard;
        if (dayInfo.isInTemplateContainer) {
          c.icons = [new CellIcon(IN_CONTAINER_ICON, IconCornerEnum.BottomLeft)];
        }
        const badges: CellBadge[] = [];
        if (dayInfo.sumEmployees > 1) {
          badges.push(
            new CellBadge(
              `${dayInfo.engaged}/${dayInfo.sumEmployees}`,
              '#6993ff',
              '#ffffff',
              IconCornerEnum.TopLeft
            )
          );
        }
        if (dayInfo.quantity > 1) {
          badges.push(
            new CellBadge(
              `${dayInfo.engaged}/${dayInfo.quantity}`,
              '#1bc5bd',
              '#ffffff',
              IconCornerEnum.TopRight
            )
          );
        }
        if (badges.length > 0) {
          c.badges = badges;
        }
      } else {
        c.mainText = '';
        c.cellType = CellTypeEnum.Empty;
      }
    }

    return c;
  }

  public getGroupIndex(index: number) {
    return index;
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
    return row === this.rows - 1;
  }

  public override getItemMainText(row: number, col: number): string {
    if (row < this.shiftRows.length) {
      const shiftRow = this.shiftRows[row];
      const dateKey = this.getDateKeyForColumn(col);

      if (shiftRow.activeDays.has(dateKey)) {
        return shiftRow.shiftName;
      }
    }
    return '';
  }

  public isInTemplateContainer(row: number, col: number): boolean {
    if (row < this.shiftRows.length) {
      const shiftRow = this.shiftRows[row];
      const dateKey = this.getDateKeyForColumn(col);
      const dayInfo = shiftRow.activeDays.get(dateKey);
      return dayInfo?.isInTemplateContainer ?? false;
    }
    return false;
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

  override isColumnSealed(column: number): boolean {
    return false;
  }

  private initializeShiftRows(): void {
    this.shiftRows = [];
    this.rowGroupIndex = [];
    this.indexGroupRow = [];

    const shiftMap = new Map<string, ShiftRow>();

    for (const schedule of this.dataManagementSchedule.shiftSchedules) {
      if (!shiftMap.has(schedule.shiftId)) {
        shiftMap.set(schedule.shiftId, {
          shiftId: schedule.shiftId,
          shiftName: schedule.shiftName,
          abbreviation: schedule.abbreviation,
          startShift: schedule.startShift,
          endShift: schedule.endShift,
          workTime: schedule.workTime,
          activeDays: new Map<string, DayInfo>(),
          isSporadic: schedule.isSporadic,
          isTimeRange: schedule.isTimeRange,
          shiftType: schedule.shiftType,
        });
      }

      const shiftRow = shiftMap.get(schedule.shiftId)!;
      const dateKey = this.formatDateKey(schedule.date);
      shiftRow.activeDays.set(dateKey, {
        isInTemplateContainer: schedule.isInTemplateContainer,
        sumEmployees: schedule.sumEmployees,
        quantity: schedule.quantity,
        sporadicScope: schedule.sporadicScope,
        engaged: schedule.engaged,
      });
    }

    this.shiftRows = Array.from(shiftMap.values()).sort((a, b) =>
      a.shiftName.localeCompare(b.shiftName)
    );

    for (let i = 0; i < this.shiftRows.length; i++) {
      this.rowGroupIndex.push(i);
      this.indexGroupRow.push(i);
    }

    this.rows = this.shiftRows.length;
  }

  private formatDateKey(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getDateKeyForColumn(col: number): string {
    if (this.startDate) {
      const date = addDays(this.startDate, col);
      return this.formatDateKey(date);
    }
    return '';
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

  getShiftId(row: number): string | undefined {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].shiftId;
    }
    return undefined;
  }

  getShiftName(row: number): string {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].shiftName;
    }
    return '';
  }

  getShiftIsSporadic(row: number): boolean {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].isSporadic;
    }
    return false;
  }

  getShiftIsTimeRange(row: number): boolean {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].isTimeRange;
    }
    return false;
  }

  getShiftType(row: number): number {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].shiftType;
    }
    return 0;
  }

  getShiftWorkTime(row: number): number {
    if (row < this.shiftRows.length) {
      return this.shiftRows[row].workTime;
    }
    return 0;
  }

  formatWorkTime(workTime: number): string {
    const ownTime = transformNumberToOwnTime(workTime, true);
    const hours = ownTime.hours.padStart(2, '0');
    const minutes = ownTime.minutes.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getRowHeaderSlot1Text(index: number): string {
    return this.getShiftName(index);
  }

  getRowHeaderSlot2Text(index: number): string {
    return '';
  }

  getRowHeaderSlot3Text(index: number): string {
    return '';
  }

  getShiftDragData(row: number, column: number): ShiftDragData | null {
    if (row >= this.shiftRows.length) {
      return null;
    }

    const shiftRow = this.shiftRows[row];
    const dateKey = this.getDateKeyForColumn(column);

    if (!shiftRow.activeDays.has(dateKey)) {
      return null;
    }

    return {
      shiftId: shiftRow.shiftId,
      shiftName: shiftRow.shiftName,
      abbreviation: shiftRow.abbreviation,
      startShift: shiftRow.startShift,
      endShift: shiftRow.endShift,
      workTime: shiftRow.workTime,
      sourceColumn: column,
    };
  }

  isShiftAffectedByNotification(row: number): boolean {
    if (row >= this.shiftRows.length) {
      return false;
    }
    const shiftId = this.shiftRows[row].shiftId;
    return this.workNotificationService.isShiftAffected(shiftId);
  }

  override isRowHighlighted(row: number): boolean {
    return this.isShiftAffectedByNotification(row);
  }

  override isCellHighlighted(row: number, col: number): boolean {
    if (this.isRowHighlighted(row)) {
      return true;
    }
    if (row >= this.shiftRows.length) {
      return false;
    }
    const shiftRow = this.shiftRows[row];
    const dateKey = this.getDateKeyForColumn(col);
    const dayInfo = shiftRow.activeDays.get(dateKey);
    if (!dayInfo) {
      return false;
    }
    const maxCapacity = dayInfo.sumEmployees * dayInfo.quantity;
    return dayInfo.engaged >= maxCapacity;
  }

  override isCellActive(row: number, col: number): boolean {
    if (row >= this.shiftRows.length) {
      return false;
    }
    const shiftRow = this.shiftRows[row];
    const dateKey = this.getDateKeyForColumn(col);
    const dayInfo = shiftRow.activeDays.get(dateKey);
    if (!dayInfo) {
      return false;
    }
    const maxCapacity = dayInfo.sumEmployees * dayInfo.quantity;
    return dayInfo.engaged < maxCapacity;
  }

  override handlePaste(_startRow: number, _startCol: number, _data: string[][]): void {
    // Paste not supported in shift grid
  }

  findRowByShiftIdAndColumn(shiftId: string, column: number): number {
    const dateKey = this.getDateKeyForColumn(column);

    for (let i = 0; i < this.shiftRows.length; i++) {
      const shiftRow = this.shiftRows[i];
      if (shiftRow.shiftId === shiftId && shiftRow.activeDays.has(dateKey)) {
        return i;
      }
    }

    return -1;
  }

  getEngagedCount(row: number, column: number): number {
    if (row >= this.shiftRows.length) {
      return 0;
    }
    const shiftRow = this.shiftRows[row];
    const dateKey = this.getDateKeyForColumn(column);
    const dayInfo = shiftRow.activeDays.get(dateKey);
    return dayInfo?.engaged ?? 0;
  }

  getDateForColumn(column: number): Date | null {
    if (!this.startDate) {
      return null;
    }
    return addDays(this.startDate, column);
  }
}
