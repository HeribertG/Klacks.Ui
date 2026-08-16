// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing schedule dialogs (correction, replacement, expenses, container split).
 * Provides methods to open dialogs for creating new or editing existing
 * work changes and container splits. Holds references to dialog components set during init.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Opens: CorrectionDialogComponent, ReplacementDialogComponent, ExpensesDialogComponent, TravelDialogComponent, BriefingDialogComponent, ContainerWorkEditDialogComponent, ContainerSplitDialogComponent
 * - Uses: ScheduleDataService for entry lookup
 */
import { Injectable } from '@angular/core';
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { CorrectionDialogComponent } from '../../dialogs/correction-dialog/correction-dialog.component';
import { ReplacementDialogComponent } from '../../dialogs/replacement-dialog/replacement-dialog.component';
import { WorkEditDialogComponent } from '../../dialogs/work-edit-dialog/work-edit-dialog.component';
import { ExpensesDialogComponent } from '../../dialogs/expenses-dialog/expenses-dialog.component';
import { ContainerWorkEditDialogComponent } from '../../dialogs/container-work-edit-dialog/container-work-edit-dialog.component';
import { TravelDialogComponent } from '../../dialogs/travel-dialog/travel-dialog.component';
import { BriefingDialogComponent } from '../../dialogs/briefing-dialog/briefing-dialog.component';
import { ContainerSplitDialogComponent } from '../../dialogs/container-split-dialog/container-split-dialog.component';
import { AvailableShift } from 'src/app/domain/models/schedule/available-shift';
import { WeekDaysEnum } from 'src/app/presentation/shared/grid/enums/divers';
import { ScheduleDataService } from './schedule-data.service';

@Injectable()
export class ScheduleDialogService {
  private correctionDialog: CorrectionDialogComponent | null = null;
  private replacementDialog: ReplacementDialogComponent | null = null;
  private workEditDialog: WorkEditDialogComponent | null = null;
  private expensesDialog: ExpensesDialogComponent | null = null;
  private containerWorkEditDialog: ContainerWorkEditDialogComponent | null = null;
  private travelDialog: TravelDialogComponent | null = null;
  private briefingDialog: BriefingDialogComponent | null = null;
  private containerSplitDialog: ContainerSplitDialogComponent | null = null;

  setDialogs(
    correctionDialog: CorrectionDialogComponent,
    replacementDialog: ReplacementDialogComponent,
    workEditDialog: WorkEditDialogComponent,
    expensesDialog: ExpensesDialogComponent,
    containerWorkEditDialog: ContainerWorkEditDialogComponent,
    travelDialog: TravelDialogComponent,
    briefingDialog: BriefingDialogComponent,
    containerSplitDialog: ContainerSplitDialogComponent,
  ): void {
    this.correctionDialog = correctionDialog;
    this.replacementDialog = replacementDialog;
    this.workEditDialog = workEditDialog;
    this.expensesDialog = expensesDialog;
    this.containerWorkEditDialog = containerWorkEditDialog;
    this.travelDialog = travelDialog;
    this.briefingDialog = briefingDialog;
    this.containerSplitDialog = containerSplitDialog;
  }

  openCorrectionDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.correctionDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.correctionDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openTravelDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.travelDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.travelDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openBriefingDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.briefingDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.briefingDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openReplacementDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.replacementDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.replacementDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openExpensesDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.expensesDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.expensesDialog.open(entry.sourceId, entry.clientId, date);
    }
  }

  editWorkChange(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.WorkChange && date) {
      const isCorrection = entry.workChangeType === 0 || entry.workChangeType === 1;
      const isTravel = entry.workChangeType === 4 || entry.workChangeType === 5 || entry.workChangeType === 6;
      const isBriefing = entry.workChangeType === 7 || entry.workChangeType === 8;

      if (isCorrection && this.correctionDialog) {
        this.correctionDialog.openEdit(entry.id, date);
      } else if (isTravel && this.travelDialog) {
        this.travelDialog.openEdit(entry.id, date);
      } else if (isBriefing && this.briefingDialog) {
        this.briefingDialog.openEdit(entry.id, date);
      } else if (this.replacementDialog) {
        this.replacementDialog.openEdit(entry.id, entry.clientId, date);
      }
    } else if (entry?.entryType === WorkScheduleEntryType.Expenses && date && this.expensesDialog) {
      this.expensesDialog.openEdit(entry.id, entry.clientId, date);
    }
  }

  openWorkEditDialog(row: number, column: number, dataService: ScheduleDataService, preResolvedEntry?: IScheduleCell): void {
    if (!this.workEditDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.workEditDialog.open({
        workId: entry.sourceId,
        clientId: entry.clientId,
        shiftId: entry.entryId,
        currentDate: date,
        workStartTime: entry.startTime,
        workEndTime: entry.endTime,
        information: entry.information,
        lockLevel: entry.lockLevel,
        surcharges: entry.surcharges ?? 0,
      });
    }
  }

  openContainerSplitDialog(
    row: number,
    column: number,
    dataService: ScheduleDataService,
    preResolvedEntry?: IScheduleCell,
  ): void {
    if (!this.containerSplitDialog) return;
    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);
    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.containerSplitDialog.open({
        workId: entry.sourceId,
        shiftId: entry.entryId,
        clientId: entry.clientId,
        containerStart: entry.startTime,
        containerEnd: entry.endTime,
        currentDate: date,
      });
    }
  }

  openContainerWorkEditDialog(row: number, column: number, dataService: ScheduleDataService, availableShifts: AvailableShift[], preResolvedEntry?: IScheduleCell): void {
    if (!this.containerWorkEditDialog) return;

    const entry = preResolvedEntry ?? dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      const weekday = dataService.getWeekday(column);
      const isHoliday = weekday === WeekDaysEnum.Holiday || weekday === WeekDaysEnum.OfficiallyHoliday;
      this.containerWorkEditDialog.open({
        workId: entry.sourceId,
        shiftId: entry.entryId,
        currentDate: date,
        availableShifts,
        containerStartTime: entry.startTime,
        containerEndTime: entry.endTime,
        isHoliday,
      });
    }
  }
}
