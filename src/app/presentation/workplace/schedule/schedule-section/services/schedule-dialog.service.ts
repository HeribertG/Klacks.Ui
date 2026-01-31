/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing work change dialogs (correction and replacement).
 * Provides methods to open dialogs for creating new or editing existing
 * work changes. Holds references to dialog components set during init.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Opens: CorrectionDialogComponent, ReplacementDialogComponent
 * - Uses: ScheduleDataService for entry lookup
 */
import { Injectable } from '@angular/core';
import { WorkScheduleEntryType } from 'src/app/domain/models/work-schedule-class';
import { CorrectionDialogComponent } from '../../dialogs/correction-dialog/correction-dialog.component';
import { ReplacementDialogComponent } from '../../dialogs/replacement-dialog/replacement-dialog.component';
import { ScheduleDataService } from './schedule-data.service';

@Injectable()
export class ScheduleDialogService {
  private correctionDialog: CorrectionDialogComponent | null = null;
  private replacementDialog: ReplacementDialogComponent | null = null;

  setDialogs(
    correctionDialog: CorrectionDialogComponent,
    replacementDialog: ReplacementDialogComponent
  ): void {
    this.correctionDialog = correctionDialog;
    this.replacementDialog = replacementDialog;
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

  editWorkChange(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    const date = dataService.getDateForColumn(column);

    if (entry?.entryType === WorkScheduleEntryType.WorkChange && date) {
      const isCorrection = entry.workChangeType === 0 || entry.workChangeType === 1;
      if (isCorrection && this.correctionDialog) {
        this.correctionDialog.openEdit(entry.id, date);
      } else if (this.replacementDialog) {
        this.replacementDialog.openEdit(entry.id, date);
      }
    }
  }
}
