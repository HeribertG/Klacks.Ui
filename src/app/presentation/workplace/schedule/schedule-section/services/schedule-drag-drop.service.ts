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
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftDropResult } from '../../services/shift-to-schedule-drag-drop.service';
import { CellValueChangeEvent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ScheduleDataService } from './schedule-data.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

export interface DropTargetInfo {
  row: number;
  clientId: string;
  date: Date;
  isEmpty: boolean;
}

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

  getDropTargetInfo(
    mouseY: number,
    column: number,
    dataService: ScheduleDataService
  ): DropTargetInfo | null {
    const scheduleElement = document.querySelector('app-schedule-section .box');
    if (!scheduleElement) {
      return null;
    }

    const rect = scheduleElement.getBoundingClientRect();
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

    return {
      row,
      clientId: client.id,
      date,
      isEmpty,
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
    const clientIndex = dataService.rowGroupIndex[event.row];
    if (clientIndex === undefined) {
      return;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) {
      return;
    }

    const date = dataService.getDateForColumn(event.column);
    if (!date) {
      return;
    }

    const trimmedValue = event.value.trim();
    if (!trimmedValue) {
      return;
    }

    const existingEntry = dataService.getWorkScheduleEntryForCell(event.row, event.column);
    if (existingEntry && existingEntry.entryType === WorkScheduleEntryType.ScheduleNote) {
      this.updateScheduleNote(existingEntry.id, client.id, date, trimmedValue);
      return;
    }

    if (existingEntry?.entryType === WorkScheduleEntryType.ScheduleCommand) {
      const commandKeywords = this.getCommandKeywords();
      const matchedCommand = commandKeywords.find(
        (kw) => kw.toUpperCase() === trimmedValue.toUpperCase(),
      );
      if (matchedCommand) {
        this.updateScheduleCommand(existingEntry.sourceId, client.id, date, matchedCommand);
      }
      return;
    }

    const abbreviation = trimmedValue.toUpperCase();
    const matchingShift = this.dataManagement.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === abbreviation &&
        this.isSameDay(shift.date, date)
    );

    if (matchingShift) {
      this.dataManagement.addWorkScheduleEntry({
        clientId: client.id,
        date: date,
        shiftId: matchingShift.shiftId,
        workTime: matchingShift.workTime,
        startTime: matchingShift.startShift,
        endTime: matchingShift.endShift,
      });
      return;
    }

    const matchingAbsence = this.findAbsenceWithoutDetails(abbreviation);
    if (matchingAbsence) {
      this.entryActions.addBreakFromAbsenceMenu(matchingAbsence.id!, event.row, event.column, dataService);
      return;
    }

    const commandKeywords = this.getCommandKeywords();
    const matchedCommand = commandKeywords.find(
      (kw) => kw.toUpperCase() === trimmedValue.toUpperCase(),
    );
    if (matchedCommand) {
      this.createScheduleCommand(client.id, date, matchedCommand);
      return;
    }

    this.createScheduleNote(client.id, date, trimmedValue);
  }

  private updateScheduleNote(id: string, clientId: string, date: Date, content: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleNoteResource = { id, clientId, currentDate: dateStr, content };
    this.scheduleNoteService.update(resource).subscribe(() => {
      this.dataManagement.readDatas(false);
    });
  }

  private createScheduleNote(clientId: string, date: Date, content: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleNoteResource = {
      id: crypto.randomUUID(),
      clientId,
      currentDate: dateStr,
      content,
    };
    this.scheduleNoteService.create(resource).subscribe(() => {
      this.dataManagement.readDatas(false);
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
    };
    this.scheduleCommandService.create(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
    });
  }

  private updateScheduleCommand(id: string, clientId: string, date: Date, keyword: string): void {
    const dateStr = formatDateOnly(date);
    const resource: ScheduleCommandResource = {
      id,
      clientId,
      currentDate: dateStr,
      commandKeyword: keyword,
    };
    this.scheduleCommandService.update(resource).subscribe({
      next: () => this.dataManagement.readDatas(false),
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
