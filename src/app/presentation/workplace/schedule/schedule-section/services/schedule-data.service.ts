// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Data service providing schedule grid data. Extends BaseDataService to supply
 * cell content, formatting, and client-row mappings. Manages work schedule entries,
 * breaks, and work changes. Core data provider for ScheduleSectionComponent.
 *
 * @relations
 * - Extends: BaseDataService
 * - Used by: ScheduleSectionComponent, ScheduleContextMenuService
 * - Uses: DataManagementScheduleService for raw schedule data
 * - Uses: Cell formatter services for display formatting
 */
import { WeekDay } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { HolidayDate } from 'src/app/domain/models/calendar/calendar-rule-class';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { addDays, compareDate, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { hoursToHHMM } from 'src/app/shared/helpers/time-format.helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { HeaderCellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { EmptyCellFormatterService } from './cell-formatters/empty-cell-formatter.service';
import { WorkCellFormatterService } from './cell-formatters/work-cell-formatter.service';
import { BreakCellFormatterService } from './cell-formatters/break-cell-formatter.service';
import { ScheduleNoteCellFormatterService } from './cell-formatters/schedule-note-cell-formatter.service';
import { BreakCellParams } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { CellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';

@Injectable()
export class ScheduleDataService extends BaseDataService {
  public override holidayCollection = inject(HolidayCollectionService);
  protected gridSetting = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettingsService = inject(AppSettingsManagementService);
  private emptyFormatter = inject(EmptyCellFormatterService);
  private workFormatter = inject(WorkCellFormatterService);
  private breakFormatter = inject(BreakCellFormatterService);
  private scheduleNoteFormatter = inject(ScheduleNoteCellFormatterService);
  private gridColorService = inject(GridColorService);
  private absenceLookup = inject(AbsenceLookupService);
  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private translateService = inject(TranslateService);
  private settings = inject(BaseSettingsService);
  private gridFonts = inject(GridFontsService);

  public override rowGroupIndex: number[] = new Array<number>();
  public override indexGroupRow: number[] = new Array<number>();
  public override startDate: Date | undefined;

  private rowsNumber = 0;
  private columnsNumber = 0;

  private copiedCells: (IScheduleCell | undefined)[][] = [];
  private copiedCellsMinRow = 0;
  private copiedCellsMinCol = 0;

  public override setMetrics(): void {
    this.initializeDateAndColumns();
    this.initializeGroupIndices();

    this.refreshSignal.set(true);
    setTimeout(() => this.refreshSignal.set(false), 0);
  }

  public override getCell(row: number, col: number): GridCell {
    const entry = this.getWorkScheduleEntryForCell(row, col);

    let cell: GridCell;

    if (!entry) {
      cell = this.emptyFormatter.formatCell(undefined);
    } else {
      switch (entry.entryType) {
        case WorkScheduleEntryType.Break:
          cell = this.breakFormatter.formatCell(entry);
          break;
        case WorkScheduleEntryType.WorkChange:
        case WorkScheduleEntryType.Expenses:
          cell = this.formatWorkChangeCell(entry);
          break;
        case WorkScheduleEntryType.ScheduleNote:
          cell = this.scheduleNoteFormatter.formatCell(entry);
          this.applyNoteColSpan(cell, row, col);
          break;
        case WorkScheduleEntryType.Work:
        default:
          cell = this.workFormatter.formatCell(entry);
          break;
      }
    }

    if (this.dataManagementSchedule.showAvailability()) {
      this.applyAvailabilityHighlighting(cell, row, col, !entry);
    }

    return cell;
  }

  getWorkScheduleEntryForCell(
    row: number,
    col: number,
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

  public getBreakPlaceholdersForClient(clientIndex: number): IBreakPlaceholder[] {
    const client = this.dataManagementSchedule.clients[clientIndex];
    if (!client?.id) return [];
    return this.breakPlaceholderLoader.getBreakPlaceholdersForClient(client.id);
  }

  public getNeededRowsForClient(clientIndex: number): number {
    const client = this.dataManagementSchedule.clients[clientIndex];
    return client?.neededRows ?? 0;
  }

  public getDisplayRowsForClient(clientIndex: number): number {
    const client = this.dataManagementSchedule.clients[clientIndex];
    return client?.displayRows ?? 0;
  }

  public getRowHeaderSlot1Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(client.id);
    if (!periodHours) return '';
    return hoursToHHMM(periodHours.guaranteedHours);
  }

  public getRowHeaderSlot2Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(client.id);
    if (!periodHours) return '';
    return hoursToHHMM(periodHours.hours);
  }

  public getRowHeaderSlot3Text(index: number): string {
    const client = this.dataManagementSchedule.clients[index];
    if (!client) return '';
    const periodHours = this.dataManagementSchedule.periodHours.get(client.id);
    if (!periodHours) return '';
    return hoursToHHMM(periodHours.surcharges);
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
    if (!entry) return '';

    if (entry.entryType === WorkScheduleEntryType.Break) {
      const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
      return this.absenceLookup.getAbbreviationForEntryId(entry.entryId, language);
    }

    if (entry.entryType === WorkScheduleEntryType.ScheduleNote) {
      return entry.description?.de || entry.description?.en || '';
    }

    return entry.abbreviation || '';
  }

  override onCopy(minRow: number, minCol: number, maxRow: number, maxCol: number): void {
    this.copiedCellsMinRow = minRow;
    this.copiedCellsMinCol = minCol;
    this.copiedCells = [];

    for (let row = minRow; row <= maxRow; row++) {
      const rowData: (IScheduleCell | undefined)[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const entry = this.getWorkScheduleEntryForCell(row, col);
        rowData.push(entry ? { ...entry } : undefined);
      }
      this.copiedCells.push(rowData);
    }
  }

  override onClearCopy(): void {
    this.copiedCells = [];
  }

  public override isCellEditable(row: number, col: number): boolean {
    if (this.isColumnSealed(col)) {
      return false;
    }

    const entry = this.getWorkScheduleEntryForCell(row, col);
    if (entry && (entry.lockLevel > 0 || entry.isGroupRestricted)) {
      return false;
    }

    if (entry && entry.entryType === WorkScheduleEntryType.ScheduleNote) {
      return true;
    }

    return !this.isCellActive(row, col);
  }

  /**
   * Only Work and Break entries can be dragged (Fill-Handle).
   * WorkChange and Expenses are NOT draggable.
   */
  public override isCellDraggable(row: number, col: number): boolean {
    const entry = this.getWorkScheduleEntryForCell(row, col);
    if (!entry) return false;

    return (
      entry.entryType === WorkScheduleEntryType.Work ||
      entry.entryType === WorkScheduleEntryType.Break
    );
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
        return this.gridColorService.availableShiftsHeaderColor;
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
        row < this.dataManagementSchedule.clients[client].displayRows;
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
        this.ensureCorrectYearLoaded(today);

        const result = this.holidayCollection.holidays.holidayList.find((x) =>
          compareDate(x.currentDate, today),
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

  private ensureCorrectYearLoaded(date: Date): void {
    const year = date.getFullYear();
    const currentYear = this.holidayCollection.currentYear;

    if (year < currentYear - 1 || year > currentYear + 1) {
      this.holidayCollection.currentYear = year;
    }
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
        this.ensureCorrectYearLoaded(today);

        return this.holidayCollection.holidays.holidayList.find((x) =>
          compareDate(x.currentDate, today),
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
      date,
    );
  }

  getDateForColumn(col: number): Date | undefined {
    if (!this.startDate) {
      return undefined;
    }
    return addDays(this.startDate, col);
  }

  getAllEntriesForClientAndColumn(row: number, col: number): IScheduleCell[] {
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
      date,
    );
  }

  override handlePaste(
    startRow: number,
    startCol: number,
    data: string[][],
  ): void {
    if (this.copiedCells.length > 0) {
      this.handlePasteFromCopiedCells(startRow, startCol);
      return;
    }

    this.handleExternalTextPaste(startRow, startCol, data);
  }

  /**
   * Handles paste operation using internally stored copied cells.
   *
   * IMPORTANT - Availability check differences:
   * - Work/Shift: REQUIRES availability check (quantity * sumEmployees limit)
   *   The shift must have remaining capacity before a work entry can be created.
   * - Break/Absence: NO availability check needed.
   *   Breaks can be created without any capacity restrictions.
   */
  private handlePasteFromCopiedCells(startRow: number, startCol: number): void {
    const workEntriesToAdd: {
      clientId: string;
      date: Date;
      shiftId: string;
      workTime: number;
      startTime: string;
      endTime: string;
    }[] = [];

    const breakEntriesToAdd: BreakCellParams[] = [];

    for (let rowOffset = 0; rowOffset < this.copiedCells.length; rowOffset++) {
      const rowData = this.copiedCells[rowOffset];
      for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
        const copiedEntry = rowData[colOffset];
        if (!copiedEntry) continue;

        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;

        if (this.isColumnSealed(targetCol)) continue;
        if (this.isCellActive(targetRow, targetCol)) continue;

        const clientIndex = this.rowGroupIndex[targetRow];
        if (clientIndex === undefined) continue;

        const client = this.dataManagementSchedule.clients[clientIndex];
        if (!client || !client.id) continue;

        const date = this.getDateForColumn(targetCol);
        if (!date) continue;

        if (copiedEntry.entryType === WorkScheduleEntryType.Break) {
          // Break/Absence: No availability check needed
          breakEntriesToAdd.push({
            clientId: client.id,
            absenceId: copiedEntry.entryId,
            date: date,
            workTime: 0,
            startTime: copiedEntry.startTime || '00:00',
            endTime: copiedEntry.endTime || '00:00',
          });
        } else {
          // Work/Shift: Requires availability check (handled by findShiftByIdAndDate)
          const matchingShift = this.findShiftByIdAndDate(copiedEntry.entryId, date);
          if (matchingShift) {
            workEntriesToAdd.push({
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
    }

    if (workEntriesToAdd.length > 0) {
      this.dataManagementSchedule.bulkAddWorkScheduleEntries(workEntriesToAdd);
    }

    if (breakEntriesToAdd.length > 0) {
      this.dataManagementSchedule.bulkAddBreakScheduleEntries(breakEntriesToAdd);
    }
  }

  /**
   * Handles paste from external sources (Excel, text).
   * Only supports Work/Shift entries (by abbreviation).
   * Break/Absence paste is NOT supported here - use internal copy/paste instead.
   */
  private handleExternalTextPaste(
    startRow: number,
    startCol: number,
    data: string[][],
  ): void {
    const workEntriesToAdd: {
      clientId: string;
      date: Date;
      shiftId: string;
      workTime: number;
      startTime: string;
      endTime: string;
    }[] = [];

    for (let rowOffset = 0; rowOffset < data.length; rowOffset++) {
      const rowData = data[rowOffset];
      for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
        const abbreviation = rowData[colOffset].trim();
        if (!abbreviation) continue;

        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;

        if (this.isColumnSealed(targetCol)) continue;
        if (this.isCellActive(targetRow, targetCol)) continue;

        const clientIndex = this.rowGroupIndex[targetRow];
        if (clientIndex === undefined) continue;

        const client = this.dataManagementSchedule.clients[clientIndex];
        if (!client || !client.id) continue;

        const date = this.getDateForColumn(targetCol);
        if (!date) continue;

        const matchingShift = this.findShiftByAbbreviationAndDate(abbreviation, date);
        if (matchingShift) {
          workEntriesToAdd.push({
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

    if (workEntriesToAdd.length > 0) {
      this.dataManagementSchedule.bulkAddWorkScheduleEntries(workEntriesToAdd);
    }
  }

  private findShiftByAbbreviationAndDate(
    abbreviation: string,
    date: Date,
  ):
    | {
        shiftId: string;
        workTime: number;
        startShift: string;
        endShift: string;
      }
    | undefined {
    const upperAbbr = abbreviation.toUpperCase();
    const matchingShift = this.dataManagementSchedule.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === upperAbbr &&
        this.isSameDay(shift.date, date),
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

  private findShiftByIdAndDate(
    shiftId: string,
    date: Date,
  ): { shiftId: string; workTime: number; startShift: string; endShift: string } | undefined {
    const matchingShift = this.dataManagementSchedule.shiftSchedules.find(
      (shift) => shift.shiftId === shiftId && this.isSameDay(shift.date, date),
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

  private findAbsenceByAbbreviation(
    abbreviation: string,
  ): { absenceId: string; startTime?: string; endTime?: string } | undefined {
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const upperAbbr = abbreviation.toUpperCase();
    const absences = this.absenceLookup.absences();
    const details = this.absenceLookup.absenceDetails();

    for (const detail of details) {
      if (!detail.id || !detail.absenceId) continue;
      const absence = absences.find((a) => a.id === detail.absenceId);
      if (!absence?.abbreviation) continue;

      const detailAbbr = this.getLocalizedAbbreviation(absence.abbreviation, language);
      if (detailAbbr.toUpperCase() === upperAbbr) {
        return {
          absenceId: detail.absenceId,
          startTime: detail.startTime,
          endTime: detail.endTime,
        };
      }
    }

    for (const absence of absences) {
      if (!absence.id || !absence.abbreviation) continue;
      const abbrValue = this.getLocalizedAbbreviation(absence.abbreviation, language);
      if (abbrValue.toUpperCase() === upperAbbr) {
        return { absenceId: absence.id };
      }
    }

    return undefined;
  }

  private getLocalizedAbbreviation(
    abbreviation: { de?: string; en?: string; fr?: string; it?: string } | undefined,
    language: string,
  ): string {
    if (!abbreviation) return '';
    const value = (abbreviation as Record<string, string | undefined>)[language];
    return value || abbreviation.de || abbreviation.en || '';
  }

  findFirstRowByShiftIdAndColumn(shiftId: string, column: number): number {
    const date = this.getDateForColumn(column);
    if (!date) return -1;

    const dateKey = formatDateOnly(date);
    const matchingEntry = this.dataManagementSchedule.workScheduleEntries.find(
      (e: IScheduleCell) => e.entryId === shiftId && formatDateOnly(new Date(e.entryDate)) === dateKey
    );

    if (!matchingEntry) return -1;

    this.initializeGroupIndices();

    const clientIndex = this.dataManagementSchedule.clients.findIndex(
      (c) => c.id === matchingEntry.clientId
    );
    if (clientIndex < 0 || clientIndex >= this.indexGroupRow.length) return -1;

    return this.indexGroupRow[clientIndex];
  }

  setScrollPosition(position: number): void {
    this.gridScroll.verticalScrollPosition = position;
  }

  findRowByClientId(clientId: string): number {
    const clientIndex = this.dataManagementSchedule.clients.findIndex(c => c.id === clientId);
    if (clientIndex < 0) return -1;

    if (clientIndex >= this.indexGroupRow.length) {
      this.initializeGroupIndices();
    }

    if (clientIndex >= this.indexGroupRow.length) return -1;
    return this.indexGroupRow[clientIndex];
  }

  getColumnForDate(dateStr: string): number {
    if (!this.startDate) return -1;
    const targetDate = new Date(dateStr);
    const diffTime = targetDate.getTime() - this.startDate.getTime();
    const column = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return column >= 0 && column < this.columns ? column : -1;
  }


  private formatWorkChangeCell(entry: IScheduleCell): GridCell {
    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = this.getWorkChangeAbbreviation(entry);

    if (entry.entryType === WorkScheduleEntryType.Expenses) {
      cell.firstSubText = '';
      cell.secondSubText = this.formatAmount(entry.amount);
      cell.backgroundColor = this.gridColorService.surchargeColor;
      cell.tooltip = entry.taxable
        ? this.translateService.instant('workChange.tooltip.expenses')
        : this.translateService.instant('workChange.tooltip.reimbursement');
    } else {
      cell.firstSubText = this.formatWorkChangeTime(entry.changeTime);
      cell.secondSubText = formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);
      cell.backgroundColor = this.gridColorService.workChangeColor;
      cell.tooltip = entry.replaceClientId
        ? this.translateService.instant('workChange.tooltip.replacement')
        : this.translateService.instant('workChange.tooltip.correction');
    }

    cell.sealed = entry.lockLevel > 0 || entry.isGroupRestricted;

    return cell;
  }

  private getWorkChangeAbbreviation(entry: IScheduleCell): string {
    if (entry.entryType === WorkScheduleEntryType.Expenses) {
      return entry.taxable
        ? this.translateService.instant('workChange.abbr.expenses')
        : this.translateService.instant('workChange.abbr.reimbursement');
    }

    if (entry.replaceClientId) {
      return this.translateService.instant('workChange.abbr.replacement');
    }

    return this.translateService.instant('workChange.abbr.correction');
  }

  private formatAmount(amount: number | null): string {
    if (amount === null || amount === 0) return '';
    return amount.toFixed(2);
  }

  private formatWorkChangeTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * 60);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }

  private applyNoteColSpan(cell: GridCell, row: number, startCol: number): void {
    const maxCol = this.columns;
    let emptySpan = 1;
    for (let col = startCol + 1; col < maxCol; col++) {
      if (this.getWorkScheduleEntryForCell(row, col)) break;
      emptySpan++;
    }

    const cellWidth = this.settings.cellWidth;
    const textWidth = this.measureTextWidth(cell.mainText);
    const padding = 8;
    const neededSpan = Math.ceil((textWidth + padding) / cellWidth);
    cell.colSpan = Math.max(1, Math.min(neededSpan, emptySpan));
  }

  private measureTextWidth(text: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.length * 8;
    ctx.font = this.gridFonts.mainFontStringZoom;
    return ctx.measureText(text).width;
  }

  private applyAvailabilityHighlighting(
    cell: GridCell,
    row: number,
    col: number,
    isEmpty: boolean,
  ): void {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) return;

    const client = this.dataManagementSchedule.clients[clientIndex];
    if (!client?.id) return;

    const date = this.getDateForColumn(col);
    if (!date) return;

    const dateKey = formatDateOnly(date);
    const availability = this.dataManagementSchedule.clientAvailabilities
      .get(client.id)
      ?.get(dateKey);

    if (!availability) return;

    if (!cell.backgroundColor) {
      cell.backgroundColor = this.gridColorService.availabilityHighlightColor;
    }

    if (isEmpty) {
      cell.tooltip = this.formatAvailabilityTooltip(availability);
    }
  }

  private formatAvailabilityTooltip(rangesString: string): string {
    const ranges = rangesString.split(',');
    const formattedRanges = ranges
      .map(range => {
        const parts = range.trim().split('-');
        if (parts.length === 2) {
          return `${parts[0]} – ${parts[1]}`;
        }
        return range;
      })
      .join('\n');

    const label = this.translateService.instant('schedule.availability.times');
    return `${label}:\n${formattedRanges}`;
  }
}
