// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Dialog component for creating and editing work time corrections.
 * Allows duration-only adjustments at start or end of a work entry.
 * Validates duration and builds the API request with startTime/endTime as "00:00".
 *
 * @relations
 * - Opened by: ScheduleDialogService
 * - Uses: WorkChangeLogicService for time calculations
 * - Uses: DataWorkChangeService for API communication
 * - Counterpart: ReplacementDialogComponent
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
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
  imports: [CommonModule, FormField, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrectionDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('correctionModal');

  private ngbModal = inject(NgbModal);
  private workChangeService = inject(DataManagementWorkchangeService);
  private logicService = inject(WorkChangeLogicService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  workId = '';
  clientId = '';
  currentDate: Date | null = null;
  correctionMode = signal<CorrectionMode>(CorrectionMode.AtEnd);
  durationMinutes = 15;
  duration: OwnTime = OwnTime.forDuration('00', '00');

  private formModel = signal<{ description: string; toInvoice: boolean }>({
    description: '',
    toInvoice: false,
  });
  protected correctionForm = form(this.formModel);

  workContext: WorkTimeContext | null = null;
  validation: WorkChangeValidation = { isValid: false, changeTime: 0 };

  private modalRef: NgbModalRef | null = null;
  private editMode = false;
  private editId = '';

  CorrectionMode = CorrectionMode;

  open(workId: string, clientId: string, currentDate: Date, workStartTime: string, workEndTime: string): void {
    this.editMode = false;
    this.editId = '';
    this.workId = workId;
    this.clientId = clientId;
    this.currentDate = currentDate;
    this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);
    this.reset();
    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
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
        this.formModel.set({
          description: data.description || '',
          toInvoice: data.toInvoice,
        });
        this.correctionMode.set(
          data.type === WorkChangeType.CorrectionStart
            ? CorrectionMode.AtStart
            : CorrectionMode.AtEnd,
        );
        this.durationMinutes = Math.round(data.changeTime * 60);

        const workStartTime = data.work?.startTime || data.startTime;
        const workEndTime = data.work?.endTime || data.endTime;
        this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);

        this.recalculate();
        this.cdr.markForCheck();

        this.modalRef = this.ngbModal.open(this.modalTemplate(), {
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
    this.correctionMode.set(CorrectionMode.AtEnd);
    this.durationMinutes = this.logicService.getDefaultDurationMinutes();
    this.formModel.set({ description: '', toInvoice: true });
    this.recalculate();
  }

  onModeChange(mode: CorrectionMode): void {
    this.correctionMode.set(mode);
    this.recalculate();
  }

  onTimeChange(): void {
    this.recalculate();
  }

  onDurationChange(): void {
    this.validation = this.logicService.validateDurationOnly(this.durationMinutes);
  }

  onDurationTimeChange(): void {
    this.durationMinutes = this.duration.toMinutes();
    this.validation = this.logicService.validateDurationOnly(this.durationMinutes);
  }

  private recalculate(): void {
    if (!this.workContext) {
      this.validation = { isValid: false, changeTime: 0 };
      this.duration = OwnTime.forDuration('00', '00');
      return;
    }

    this.duration = this.logicService.minutesToOwnTime(this.durationMinutes, true);
    this.validation = this.logicService.validateDurationOnly(this.durationMinutes);
  }

  isValid(): boolean {
    return this.validation.isValid;
  }

  private mapModeToWorkChangeType(): WorkChangeType {
    switch (this.correctionMode()) {
      case CorrectionMode.AtStart:
        return WorkChangeType.CorrectionStart;
      case CorrectionMode.AtEnd:
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
      startTime: '00:00',
      endTime: '00:00',
      description: this.formModel().description,
      toInvoice: this.formModel().toInvoice,
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
      startTime: '00:00',
      endTime: '00:00',
      description: this.formModel().description,
      toInvoice: this.formModel().toInvoice,
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
