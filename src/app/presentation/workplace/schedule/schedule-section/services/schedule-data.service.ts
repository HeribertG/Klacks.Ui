// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * @copyright 2025 Heribert Gasparoli
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
 * - Uses: schedule-paste.helper for the copy/paste rules
 */
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { HolidayDate } from 'src/app/domain/models/calendar/holiday-date-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { addDays, formatDateOnly, getDayIndex } from 'src/app/domain/helpers/date.helper';
import { calendarDateKey, companyToday, parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { hoursToHHMM } from 'src/app/domain/helpers/time-format.helper';
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
import { ScheduleCommandCellFormatterService } from './cell-formatters/schedule-command-cell-formatter.service';
import { WorkChangeCellFormatterService } from './cell-formatters/work-change-cell-formatter.service';
import { collectCopiedCellsPaste, collectTextPaste } from './schedule-paste.helper';
import { ISchedulePasteTarget } from './schedule-paste-target.interface';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-placeholder.interface';
import { parseAvailabilityRanges } from 'src/app/shared/helpers/availability-range.helper';
import { formatAvailabilityTooltip } from 'src/app/domain/helpers/availability-tooltip.helper';

import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
const GROUP_PERIOD_RESTRICTED_COLOR = 'rgba(70, 130, 180, 0.25)';

@Injectable()
export class ScheduleDataService extends BaseDataService {
  public override holidayCollection = inject(HolidayCollectionService);
  protected gridSetting = inject(GridSettingsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private appSettingsService = inject(AppSettingsManagementService);
  private weekConfiguration = inject(WeekConfigurationService);
  private emptyFormatter = inject(EmptyCellFormatterService);
  private workFormatter = inject(WorkCellFormatterService);
  private breakFormatter = inject(BreakCellFormatterService);
  private scheduleNoteFormatter = inject(ScheduleNoteCellFormatterService);
  private scheduleCommandFormatter = inject(ScheduleCommandCellFormatterService);
  private workChangeFormatter = inject(WorkChangeCellFormatterService);
  private gridColorService = inject(GridColorService);
  private absenceLookup = inject(AbsenceLookupService);
  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private translateService = inject(TranslateService);
  private settings = inject(BaseSettingsService);
  private gridFonts = inject(GridFontsService);

  public showScheduleCommands = signal(false);

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
          cell = this.workChangeFormatter.formatCell(entry);
          break;
        case WorkScheduleEntryType.ScheduleNote:
          cell = this.scheduleNoteFormatter.formatCell(entry);
          this.applyNoteColSpan(cell, row, col);
          break;
        case WorkScheduleEntryType.ScheduleCommand:
          if (!this.showScheduleCommands()) {
            cell = this.emptyFormatter.formatCell(undefined);
          } else {
            cell = this.scheduleCommandFormatter.formatCell(entry);
            this.applyNoteColSpan(cell, row, col);
          }
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

    if (this.isCellOutsideMembershipPeriod(row, col)) {
      cell.sealed = true;
    }

    if (this.isCellOutsideGroupPeriod(row, col)) {
      cell.sealed = true;
      cell.backgroundColor = GROUP_PERIOD_RESTRICTED_COLOR;
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
    return hoursToHHMM(periodHours.hours + periodHours.surcharges);
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
      this.columns = getDayIndex(visibleStart, visibleEnd) + 1;
    } else {
      this.startDate = companyToday();
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

    if (entry.entryType === WorkScheduleEntryType.ScheduleNote ||
        entry.entryType === WorkScheduleEntryType.ScheduleCommand) {
      return getLocalizedValue(entry.description, this.translateService.currentLang || DomainMessages.DEFAULT_LANG);
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

    if (this.isCellOutsideMembershipPeriod(row, col)) {
      return false;
    }

    if (this.isCellOutsideGroupPeriod(row, col)) {
      return false;
    }

    const entry = this.getWorkScheduleEntryForCell(row, col);
    if (entry && (entry.lockLevel > 0 || entry.isGroupRestricted)) {
      return false;
    }

    if (entry && (entry.entryType === WorkScheduleEntryType.ScheduleNote ||
        entry.entryType === WorkScheduleEntryType.ScheduleCommand)) {
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
  override isColumnSealed(column: number): boolean {
    const date = this.getDateForColumn(column);
    if (!date) {
      return false;
    }
    return this.dataManagementSchedule.sealedDates.has(formatDateOnly(date));
  }

  public isCellOutsideMembershipPeriod(row: number, col: number): boolean {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataManagementSchedule.clients[clientIndex];
    const memberSince = client?.memberSince;
    const memberUntil = client?.memberUntil;

    if (!memberSince && !memberUntil) return false;

    const date = this.getDateForColumn(col);
    if (!date) return false;

    const dateStr = formatDateOnly(date);

    if (memberSince && dateStr < memberSince) return true;
    if (memberUntil && dateStr > memberUntil) return true;

    return false;
  }

  public isCellOutsideGroupPeriod(row: number, col: number): boolean {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) return false;

    const client = this.dataManagementSchedule.clients[clientIndex];
    const validFrom = client?.groupItemValidFrom;
    const validUntil = client?.groupItemValidUntil;

    if (!validFrom && !validUntil) return false;

    const date = this.getDateForColumn(col);
    if (!date) return false;

    const dateStr = formatDateOnly(date);

    if (validFrom && dateStr < validFrom) return true;
    if (validUntil && dateStr > validUntil) return true;

    return false;
  }

  override getHeaderFontColor(column: number): string | null {
    if (column < 0) {
      return null;
    }

    const availableShifts = this.dataManagementSchedule.availableShiftsByDay;
    const overbookedShifts = this.dataManagementSchedule.overbookedShiftsByDay;

    const hasAvailable =
      column < availableShifts.length && (availableShifts[column]?.length ?? 0) > 0;
    const hasOverbooked =
      column < overbookedShifts.length && (overbookedShifts[column]?.length ?? 0) > 0;

    if (hasAvailable || hasOverbooked) {
      return this.gridColorService.availableShiftsHeaderColor;
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

      const rowsForClient = this.settings.getDisplayRows(
        this.dataManagementSchedule.clients[client].displayRows,
      );

      for (let row = 0; row < rowsForClient; row++) {
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
      const today: Date = new Date(this.startDate.getTime());
      today.setDate(today.getDate() + column);

      if (this.holidayCollection) {
        this.ensureCorrectYearLoaded(today);

        const result = this.holidayCollection.holidays.holidayForDate(today);

        if (result) {
          return result.officially
            ? WeekDaysEnum.OfficiallyHoliday
            : WeekDaysEnum.Holiday;
        }
      }

      const weekendSlot = this.weekConfiguration.getWeekendSlot(today);
      if (weekendSlot === 1) {
        return WeekDaysEnum.Saturday;
      } else if (weekendSlot === 2) {
        return WeekDaysEnum.Sunday;
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
      const today: Date = new Date(this.startDate.getTime());
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

        return this.holidayCollection.holidays.holidayForDate(today);
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
    const resolveTarget = (row: number, col: number) => this.resolvePasteTarget(row, col);
    const shiftSchedules = this.dataManagementSchedule.shiftSchedules;

    if (this.copiedCells.length > 0) {
      const { workEntries, breakEntries } = collectCopiedCellsPaste(
        this.copiedCells, startRow, startCol, shiftSchedules, resolveTarget,
      );
      if (workEntries.length > 0) {
        this.dataManagementSchedule.bulkAddWorkScheduleEntries(workEntries);
      }
      if (breakEntries.length > 0) {
        this.dataManagementSchedule.bulkAddBreakScheduleEntries(breakEntries);
      }
      return;
    }

    const workEntries = collectTextPaste(data, startRow, startCol, shiftSchedules, resolveTarget);
    if (workEntries.length > 0) {
      this.dataManagementSchedule.bulkAddWorkScheduleEntries(workEntries);
    }
  }

  private resolvePasteTarget(row: number, col: number): ISchedulePasteTarget | undefined {
    if (this.isColumnSealed(col)) return undefined;
    if (this.isCellOutsideMembershipPeriod(row, col)) return undefined;
    if (this.isCellOutsideGroupPeriod(row, col)) return undefined;
    if (this.isCellActive(row, col)) return undefined;

    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) return undefined;

    const client = this.dataManagementSchedule.clients[clientIndex];
    if (!client || !client.id) return undefined;

    const date = this.getDateForColumn(col);
    if (!date) return undefined;

    return { clientId: client.id, date };
  }

  findFirstRowByShiftIdAndColumn(shiftId: string, column: number): number {
    const date = this.getDateForColumn(column);
    if (!date) return -1;

    const dateKey = formatDateOnly(date);
    const matchingEntry = this.dataManagementSchedule.workScheduleEntries.find(
      (e: IScheduleCell) => e.entryId === shiftId && calendarDateKey(e.entryDate) === dateKey
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
    const targetDate = parseCalendarDate(dateStr);
    if (!targetDate) return -1;
    const column = getDayIndex(this.startDate, targetDate);
    return column >= 0 && column < this.columns ? column : -1;
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

  public getAvailabilityTooltipForCell(
    row: number,
    col: number,
  ): string | undefined {
    if (!this.dataManagementSchedule.showAvailability()) {
      return undefined;
    }
    const availability = this.getAvailabilityForCell(row, col);
    if (!availability) return undefined;
    return this.formatAvailabilityTooltip(availability);
  }

  public getAvailabilityRangesForCell(
    row: number,
    col: number,
  ): { startMinutes: number; endMinutes: number }[] {
    if (!this.dataManagementSchedule.showAvailability()) {
      return [];
    }
    const availability = this.getAvailabilityForCell(row, col);
    if (!availability) return [];

    return parseAvailabilityRanges(availability);
  }

  private applyAvailabilityHighlighting(
    cell: GridCell,
    row: number,
    col: number,
    isEmpty: boolean,
  ): void {
    const availability = this.getAvailabilityForCell(row, col);
    if (!availability) return;

    if (!cell.backgroundColor) {
      cell.backgroundColor = this.gridColorService.availabilityHighlightColor;
    }

    if (isEmpty) {
      cell.tooltip = this.formatAvailabilityTooltip(availability);
    }
  }

  private getAvailabilityForCell(row: number, col: number): string | undefined {
    const clientIndex = this.rowGroupIndex[row];
    if (clientIndex === undefined) return undefined;

    const client = this.dataManagementSchedule.clients[clientIndex];
    if (!client?.id) return undefined;

    const date = this.getDateForColumn(col);
    if (!date) return undefined;

    return this.dataManagementSchedule.clientAvailabilities
      .get(client.id)
      ?.get(formatDateOnly(date));
  }

  private formatAvailabilityTooltip(rangesString: string): string {
    return formatAvailabilityTooltip(rangesString, this.translateService.instant('schedule.availability.times'));
  }
}
