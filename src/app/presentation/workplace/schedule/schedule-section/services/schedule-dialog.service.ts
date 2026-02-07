/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing work change dialogs (correction, replacement, expenses).
 * Provides methods to open dialogs for creating new or editing existing
 * work changes. Holds references to dialog components set during init.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Opens: CorrectionDialogComponent, ReplacementDialogComponent, ExpensesDialogComponent
 * - Uses: ScheduleDataService for entry lookup
 */
import { Injectable } from '@angular/core';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { CorrectionDialogComponent } from '../../dialogs/correction-dialog/correction-dialog.component';
import { ReplacementDialogComponent } from '../../dialogs/replacement-dialog/replacement-dialog.component';
import { WorkEditDialogComponent } from '../../dialogs/work-edit-dialog/work-edit-dialog.component';
import { ExpensesDialogComponent } from '../../dialogs/expenses-dialog/expenses-dialog.component';
import { ScheduleDataService } from './schedule-data.service';

@Injectable()
export class ScheduleDialogService {
  private correctionDialog: CorrectionDialogComponent | null = null;
  private replacementDialog: ReplacementDialogComponent | null = null;
  private workEditDialog: WorkEditDialogComponent | null = null;
  private expensesDialog: ExpensesDialogComponent | null = null;

  setDialogs(
    correctionDialog: CorrectionDialogComponent,
    replacementDialog: ReplacementDialogComponent,
    workEditDialog: WorkEditDialogComponent,
    expensesDialog: ExpensesDialogComponent,
  ): void {
    this.correctionDialog = correctionDialog;
    this.replacementDialog = replacementDialog;
    this.workEditDialog = workEditDialog;
    this.expensesDialog = expensesDialog;
  }

  openCorrectionDialog(row: number, column: number, dataService: ScheduleDataService): void {
    if (!this.correctionDialog) return;

    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.correctionDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openReplacementDialog(row: number, column: number, dataService: ScheduleDataService): void {
    if (!this.replacementDialog) return;

    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.replacementDialog.open(entry.sourceId, entry.clientId, date, entry.startTime, entry.endTime);
    }
  }

  openExpensesDialog(row: number, column: number, dataService: ScheduleDataService): void {
    if (!this.expensesDialog) return;

    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.expensesDialog.open(entry.sourceId, entry.clientId, date);
    }
  }

  editWorkChange(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.WorkChange && date) {
      const isCorrection = entry.workChangeType === 0 || entry.workChangeType === 1;
      if (isCorrection && this.correctionDialog) {
        this.correctionDialog.openEdit(entry.id, date);
      } else if (this.replacementDialog) {
        this.replacementDialog.openEdit(entry.id, entry.clientId, date);
      }
    } else if (entry?.entryType === WorkScheduleEntryType.Expenses && date && this.expensesDialog) {
      this.expensesDialog.openEdit(entry.id, entry.clientId, date);
    }
  }

  openWorkEditDialog(row: number, column: number, dataService: ScheduleDataService): void {
    if (!this.workEditDialog) return;

    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.Work && date) {
      this.workEditDialog.open(
        entry.sourceId,
        entry.clientId,
        entry.entryId,
        date,
        entry.startTime,
        entry.endTime,
        entry.information,
      );
    }
  }
}
