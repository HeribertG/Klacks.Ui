// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Dialog component for creating and editing work time corrections.
 * Allows adjustments at start, end, or within a work entry.
 * Validates time ranges and calculates duration changes.
 *
 * @relations
 * - Opened by: ScheduleDialogService
 * - Uses: WorkChangeLogicService for time calculations
 * - Uses: DataWorkChangeService for API communication
 * - Counterpart: ReplacementDialogComponent
 */
import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import {
  WorkChangeLogicService,
  CorrectionMode,
} from 'src/app/infrastructure/services/work-change-logic.service';
import {
  WorkChangeRequest,
  WorkChangeResource,
  WorkChangeType,
  WorkChangeValidation,
  WorkTimeContext,
} from 'src/app/domain/models/workchange/work-change';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { addDays } from 'src/app/shared/helpers/date.helper';

@Component({
  selector: 'app-correction-dialog',
  templateUrl: './correction-dialog.component.html',
  styleUrls: ['./correction-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
})
export class CorrectionDialogComponent {
  @ViewChild('correctionModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private workChangeService = inject(DataManagementWorkchangeService);
  private logicService = inject(WorkChangeLogicService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);

  workId = '';
  clientId = '';
  currentDate: Date | null = null;
  correctionMode: CorrectionMode = CorrectionMode.AtEnd;
  startTime: OwnTime = OwnTime.forTime('00', '00');
  endTime: OwnTime = OwnTime.forTime('00', '00');
  duration: OwnTime = OwnTime.forDuration('00', '00');
  description = '';
  toInvoice = false;

  workContext: WorkTimeContext | null = null;
  validation: WorkChangeValidation = { isValid: false, changeTime: 0 };

  private modalRef: NgbModalRef | null = null;
  private editMode = false;
  private editId = '';

  CorrectionMode = CorrectionMode;

  get isWithinMode(): boolean {
    return this.correctionMode === CorrectionMode.Within;
  }

  open(workId: string, clientId: string, currentDate: Date, workStartTime: string, workEndTime: string): void {
    this.editMode = false;
    this.editId = '';
    this.workId = workId;
    this.clientId = clientId;
    this.currentDate = currentDate;
    this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);
    this.reset();
    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
    });
  }

  openEdit(workChangeId: string, currentDate: Date): void {
    this.editMode = true;
    this.editId = workChangeId;
    this.currentDate = currentDate;

    this.workChangeService.get(workChangeId).subscribe({
      next: (data) => {
        this.workId = data.workId;
        this.clientId = data.work?.clientId || '';
        this.description = data.description || '';
        this.toInvoice = data.toInvoice;
        this.startTime = this.logicService.parseTimeString(data.startTime);
        this.endTime = this.logicService.parseTimeString(data.endTime);
        this.correctionMode = data.type === WorkChangeType.CorrectionStart
          ? CorrectionMode.AtStart
          : CorrectionMode.AtEnd;

        const workStartTime = data.work?.startTime || data.startTime;
        const workEndTime = data.work?.endTime || data.endTime;
        this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);

        this.recalculate();

        this.modalRef = this.ngbModal.open(this.modalTemplate, {
          centered: true,
          backdrop: 'static',
        });
      },
      error: (err) => {
        console.error('Error loading WorkChange:', err);
      },
    });
  }

  private reset(): void {
    this.correctionMode = CorrectionMode.AtEnd;
    this.description = '';
    this.toInvoice = false;
    this.onModeChange();
  }

  onModeChange(): void {
    if (this.workContext) {
      const defaults = this.logicService.getDefaultTimesForMode(this.correctionMode, this.workContext);
      this.startTime = defaults.startTime;
      this.endTime = defaults.endTime;
    }
    this.recalculate();
  }

  onTimeChange(): void {
    this.recalculate();
  }

  private recalculate(): void {
    if (!this.workContext) {
      this.validation = { isValid: false, changeTime: 0 };
      this.duration = OwnTime.forDuration('00', '00');
      return;
    }

    this.duration = this.logicService.calculateDurationDisplay(
      this.startTime,
      this.endTime,
      this.workContext
    );

    this.validation = this.logicService.validateCorrectionMode(
      this.startTime,
      this.endTime,
      this.workContext,
      this.correctionMode
    );
  }

  isValid(): boolean {
    return this.validation.isValid;
  }

  private mapModeToWorkChangeType(): WorkChangeType {
    switch (this.correctionMode) {
      case CorrectionMode.AtStart:
        return WorkChangeType.CorrectionStart;
      case CorrectionMode.AtEnd:
      case CorrectionMode.Within:
        return WorkChangeType.CorrectionEnd;
      default:
        return WorkChangeType.CorrectionEnd;
    }
  }

  onSave(): void {
    if (!this.isValid() || !this.workContext) return;

    if (this.editMode) {
      this.updateWorkChange();
    } else {
      this.createWorkChange();
    }
  }

  private createWorkChange(): void {
    const request: WorkChangeRequest = {
      workId: this.workId,
      type: this.mapModeToWorkChangeType(),
      changeTime: this.validation.changeTime,
      surcharges: 0,
      startTime: this.logicService.ownTimeToString(this.startTime),
      endTime: this.logicService.ownTimeToString(this.endTime),
      description: this.description,
      toInvoice: this.toInvoice,
      replaceClientId: null,
    };

    this.workChangeService.create(request).subscribe({
      next: (response) => {
        if (response.clientResults && this.currentDate) {
          const startDate = addDays(this.currentDate, -1);
          const endDate = addDays(this.currentDate, 1);

          for (const clientResult of response.clientResults) {
            if (clientResult.periodHours) {
              this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
            }
            if (clientResult.scheduleEntries && clientResult.scheduleEntries.length >= 0) {
              this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
            }
          }
          this.workScheduleLoader.updateClientNeededRows();
          this.scheduleEntryCrud.triggerScheduleRefresh();
        }
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('Error creating correction:', err);
      },
    });
  }

  private updateWorkChange(): void {
    const resource: WorkChangeResource = {
      id: this.editId,
      workId: this.workId,
      type: this.mapModeToWorkChangeType(),
      changeTime: this.validation.changeTime,
      surcharges: 0,
      startTime: this.logicService.ownTimeToString(this.startTime),
      endTime: this.logicService.ownTimeToString(this.endTime),
      description: this.description,
      toInvoice: this.toInvoice,
      replaceClientId: null,
    };

    this.workChangeService.update(resource).subscribe({
      next: (response) => {
        if (response.clientResults && this.currentDate) {
          const startDate = addDays(this.currentDate, -1);
          const endDate = addDays(this.currentDate, 1);

          for (const clientResult of response.clientResults) {
            if (clientResult.periodHours) {
              this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
            }
            if (clientResult.scheduleEntries && clientResult.scheduleEntries.length >= 0) {
              this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
            }
          }
          this.workScheduleLoader.updateClientNeededRows();
          this.scheduleEntryCrud.triggerScheduleRefresh();
        }
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('Error updating correction:', err);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
