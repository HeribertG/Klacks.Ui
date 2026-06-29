// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling drag-drop and cell value change operations within
 * the schedule grid. Calculates drop targets, validates positions,
 * and processes shift assignments via keyboard input.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Uses: DataManagementScheduleService for adding work entries
 * - Receives: ShiftDropResult from ShiftToScheduleDragDropService
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { DataManagementScheduleNoteService } from 'src/app/domain/services/schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from 'src/app/domain/services/schedule-command/data-management-schedule-command.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ScheduleNoteResource } from 'src/app/domain/models/schedule-note/schedule-note';
import { ScheduleCommandResource } from 'src/app/domain/models/schedule-command/schedule-command';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftDropResult } from '../../services/shift-to-schedule-drag-drop.service';
import { CellValueChangeEvent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ScheduleDataService } from './schedule-data.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';

export interface DropTargetInfo {
  row: number;
  clientId: string;
  date: Date;
  isEmpty: boolean;
  isBeforeClientStart: boolean;
}

interface CellValueContext {
  event: CellValueChangeEvent;
  dataService: ScheduleDataService;
  clientId: string;
  date: Date;
  trimmedValue: string;
  abbreviation: string;
  existingEntry: IScheduleCell | undefined;
}

type CellValueHandler = (ctx: CellValueContext) => boolean;

@Injectable()
export class ScheduleDragDropService {
  private dataManagement = inject(DataManagementScheduleService);
  private scheduleNoteService = inject(DataManagementScheduleNoteService);
  private scheduleCommandService = inject(DataManagementScheduleCommandService);
  private absenceLookup = inject(AbsenceLookupService);
  private appSettingsManagement = inject(AppSettingsManagementService);
  private entryActions = inject(ScheduleEntryActionsService);
  private translateService = inject(TranslateService);
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private analyseScenarioService = inject(AnalyseScenarioService);

  private cachedRect: DOMRect | null = null;

  invalidateBoundingRect(): void {
    this.cachedRect = null;
  }

  getDropTargetInfo(
    mouseY: number,
    column: number,
    dataService: ScheduleDataService,
    scheduleBox: HTMLElement,
  ): DropTargetInfo | null {
    if (!this.cachedRect) {
      this.cachedRect = scheduleBox.getBoundingClientRect();
    }
    const rect = this.cachedRect;
    const relativeY = mouseY - rect.top - this.settings.cellHeaderHeight;

    if (relativeY < 0) {
      return null;
    }

    const row =
      Math.floor(relativeY / this.settings.cellHeight) +
      this.scrollService.verticalScrollPosition;

    if (row < 0 || row >= dataService.rows) {
      return null;
    }

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return null;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client || !client.id) {
      return null;
    }

    const date = dataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    const isEmpty = !dataService.isCellActive(row, column);
    const isBeforeClientStart = dataService.isCellBeforeClientStart(row, column) || dataService.isCellOutsideGroupPeriod(row, column);

    return {
      row,
      clientId: client.id,
      date,
      isEmpty,
      isBeforeClientStart,
    };
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.dataManagement.addWorkScheduleEntry({
      clientId: result.targetClientId,
      date: result.targetDate,
      shiftId: result.shiftId,
      workTime: result.workTime,
      startTime: result.startShift,
      endTime: result.endShift,
    });
  }

  handleCellValueChange(event: CellValueChangeEvent, dataService: ScheduleDataService): void {
    const ctx = this.buildCellValueContext(event, dataService);
    if (!ctx) {
      return;
    }

    for (const handler of this.cellValueHandlers) {
      if (handler(ctx)) {
        return;
      }
    }
  }

  private buildCellValueContext(
    event: CellValueChangeEvent,
    dataService: ScheduleDataService,
  ): CellValueContext | null {
    const clientIndex = dataService.rowGroupIndex[event.row];
    if (clientIndex === undefined) {
      return null;
    }
    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) {
      return null;
    }
    const date = dataService.getDateForColumn(event.column);
    if (!date) {
      return null;
    }
    const trimmedValue = event.value.trim();
    if (!trimmedValue) {
      return null;
    }
    return {
      event,
      dataService,
      clientId: client.id,
      date,
      trimmedValue,
      abbreviation: trimmedValue.toUpperCase(),
      existingEntry: dataService.getWorkScheduleEntryForCell(event.row, event.column),
    };
  }

  private readonly cellValueHandlers: CellValueHandler[] = [
    (ctx) => this.tryUpdateExistingNote(ctx),
    (ctx) => this.tryUpdateExistingCommand(ctx),
    (ctx) => this.tryMatchShift(ctx),
    (ctx) => this.tryMatchAbsence(ctx),
    (ctx) => this.tryCreateCommand(ctx),
    (ctx) => this.createNoteFallback(ctx),
  ];

  private tryUpdateExistingNote(ctx: CellValueContext): boolean {
    const { existingEntry } = ctx;
    if (!existingEntry || existingEntry.entryType !== WorkScheduleEntryType.ScheduleNote) {
      return false;
    }
    this.updateScheduleNote(existingEntry.id, ctx.clientId, ctx.date, ctx.trimmedValue);
    return true;
  }

  private tryUpdateExistingCommand(ctx: CellValueContext): boolean {
    const { existingEntry } = ctx;
    if (!existingEntry || existingEntry.entryType !== WorkScheduleEntryType.ScheduleCommand) {
      return false;
    }
    const matchedCommand = this.findMatchingCommand(ctx.trimmedValue);
    if (matchedCommand) {
      this.updateScheduleCommand(existingEntry.sourceId, ctx.clientId, ctx.date, matchedCommand);
    }
    // An existing command cell consumes the edit even if the new value is not a known command.
    return true;
  }

  private tryMatchShift(ctx: CellValueContext): boolean {
    const matchingShift = this.dataManagement.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === ctx.abbreviation &&
        this.isSameDay(shift.date, ctx.date),
    );
    if (!matchingShift) {
      return false;
    }
    this.dataManagement.addWorkScheduleEntry({
      clientId: ctx.clientId,
      date: ctx.date,
      shiftId: matchingShift.shiftId,
      workTime: matchingShift.workTime,
      startTime: matchingShift.startShift,
      endTime: matchingShift.endShift,
    });
    return true;
  }

  private tryMatchAbsence(ctx: CellValueContext): boolean {
    const matchingAbsence = this.findAbsenceWithoutDetails(ctx.abbreviation);
    if (!matchingAbsence) {
      return false;
    }
    this.entryActions.addBreakFromAbsenceMenu(
      matchingAbsence.id,
      ctx.event.row,
      ctx.event.column,
      ctx.dataService,
    );
    return true;
  }

  private tryCreateCommand(ctx: CellValueContext): boolean {
    const matchedCommand = this.findMatchingCommand(ctx.trimmedValue);
    if (!matchedCommand) {
      return false;
    }
    this.createScheduleCommand(ctx.clientId, ctx.date, matchedCommand);
    return true;
  }

  private createNoteFallback(ctx: CellValueContext): boolean {
    this.createScheduleNote(ctx.clientId, ctx.date, ctx.trimmedValue);
    return true;
  }

  private findMatchingCommand(value: string): string | undefined {
    const normalized = value.toUpperCase();
    return this.getCommandKeywords().find((kw) => kw.toUpperCase() === normalized);
  }

  private updateScheduleNote(id: string, clientId: string, date: Date, content: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleNoteResource = {
      id,
      clientId,
      currentDate: dateStr,
      content,
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
    };
    this.scheduleNoteService.update(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
      error: (err) => console.error('Failed to update schedule note', { id, clientId, error: err }),
    });
  }

  private createScheduleNote(clientId: string, date: Date, content: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleNoteResource = {
      id: crypto.randomUUID(),
      clientId,
      currentDate: dateStr,
      content,
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
    };
    this.scheduleNoteService.create(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
      error: (err) => console.error('Failed to create schedule note', { clientId, error: err }),
    });
  }

  private findAbsenceWithoutDetails(abbreviation: string): { id: string } | null {
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const absences = this.absenceLookup.absences();
    const details = this.absenceLookup.absenceDetails();

    for (const absence of absences) {
      if (!absence.id || !absence.abbreviation) continue;

      const hasDetails = details.some(d => d.absenceId === absence.id);
      if (hasDetails) continue;

      const absAbbr = getLocalizedValue(absence.abbreviation as IMultiLanguage, language).toUpperCase();
      if (absAbbr === abbreviation) {
        return { id: absence.id };
      }
    }

    return null;
  }

  private getCommandKeywords(): string[] {
    const settings = this.appSettingsManagement.schedulingDefaultSettings();
    return [
      settings.commandKeywordFree,
      settings.commandKeywordEarly,
      settings.commandKeywordLate,
      settings.commandKeywordNight,
      settings.commandKeywordNegFree,
      settings.commandKeywordNegEarly,
      settings.commandKeywordNegLate,
      settings.commandKeywordNegNight,
    ];
  }

  private createScheduleCommand(clientId: string, date: Date, keyword: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleCommandResource = {
      id: crypto.randomUUID(),
      clientId,
      currentDate: dateStr,
      commandKeyword: keyword,
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
    };
    this.scheduleCommandService.create(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
      error: (err) => console.error('Failed to create schedule command', { clientId, keyword, error: err }),
    });
  }

  private updateScheduleCommand(id: string, clientId: string, date: Date, keyword: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleCommandResource = {
      id,
      clientId,
      currentDate: dateStr,
      commandKeyword: keyword,
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
    };
    this.scheduleCommandService.update(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
      error: (err) => console.error('Failed to update schedule command', { id, clientId, keyword, error: err }),
    });
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
}
