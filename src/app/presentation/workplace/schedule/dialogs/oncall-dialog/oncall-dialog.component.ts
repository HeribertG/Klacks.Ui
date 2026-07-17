// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog component for creating and editing on-call work time entries.
 * Supports two types (OnCallPresence for presence duty, OnCallStandby for standby)
 * with a Von/Bis time range that yields the raw on-call hours as changeTime.
 * Unlike corrections, the range is not constrained to the work boundaries.
 *
 * @param workId - ID of the work entry this on-call entry belongs to
 * @param clientId - ID of the client associated with the work entry
 * @param currentDate - The date of the work entry being modified
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { WorkChangeLogicService } from 'src/app/infrastructure/services/work-change-logic.service';
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
  selector: 'app-oncall-dialog',
  templateUrl: './oncall-dialog.component.html',
  styleUrls: ['./oncall-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnCallDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('onCallModal');

  private ngbModal = inject(NgbModal);
  private workChangeService = inject(DataManagementWorkchangeService);
  private logicService = inject(WorkChangeLogicService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private cdr = inject(ChangeDetectorRef);

  workId = '';
  clientId = '';
  currentDate: Date | null = null;
  onCallType = signal<WorkChangeType>(WorkChangeType.OnCallPresence);
  startTime: OwnTime = OwnTime.forTime('00', '00');
  endTime: OwnTime = OwnTime.forTime('00', '00');
  duration: OwnTime = OwnTime.forDuration('00', '00');

  private formModel = signal<{ description: string; toInvoice: boolean }>({
    description: '',
    toInvoice: false,
  });
  protected onCallForm = form(this.formModel);

  workContext: WorkTimeContext | null = null;
  validation: WorkChangeValidation = { isValid: false, changeTime: 0 };

  private modalRef: NgbModalRef | null = null;
  private editMode = false;
  private editId = '';

  WorkChangeType = WorkChangeType;

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
        this.onCallType.set(
          data.type === WorkChangeType.OnCallStandby
            ? WorkChangeType.OnCallStandby
            : WorkChangeType.OnCallPresence,
        );
        this.startTime = this.logicService.parseTimeString(data.startTime);
        this.endTime = this.logicService.parseTimeString(data.endTime);

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
    this.onCallType.set(WorkChangeType.OnCallPresence);
    this.formModel.set({ description: '', toInvoice: false });
    if (this.workContext) {
      this.startTime = this.logicService.parseTimeString(this.workContext.workStartTime);
      this.endTime = this.logicService.parseTimeString(this.workContext.workEndTime);
    }
    this.recalculate();
  }

  onTypeChange(type: WorkChangeType): void {
    this.onCallType.set(type);
  }

  onTimeChange(): void {
    this.recalculate();
  }

  private recalculate(): void {
    this.validation = this.logicService.validateOnCall(this.startTime, this.endTime);
    const durationMinutes = Math.round(Math.abs(this.validation.changeTime) * 60);
    this.duration = this.logicService.minutesToOwnTime(durationMinutes, true);
  }

  isValid(): boolean {
    return this.validation.isValid;
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
      type: this.onCallType(),
      changeTime: this.validation.changeTime,
      surcharges: 0,
      startTime: this.logicService.ownTimeToString(this.startTime),
      endTime: this.logicService.ownTimeToString(this.endTime),
      description: this.formModel().description,
      toInvoice: this.formModel().toInvoice,
      replaceClientId: null,
    };

    this.workChangeService.create(request).subscribe({
      next: (response) => {
        this.applyClientResults(response);
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('Error creating on-call entry:', err);
      },
    });
  }

  private updateWorkChange(): void {
    const resource: WorkChangeResource = {
      id: this.editId,
      workId: this.workId,
      type: this.onCallType(),
      changeTime: this.validation.changeTime,
      surcharges: 0,
      startTime: this.logicService.ownTimeToString(this.startTime),
      endTime: this.logicService.ownTimeToString(this.endTime),
      description: this.formModel().description,
      toInvoice: this.formModel().toInvoice,
      replaceClientId: null,
    };

    this.workChangeService.update(resource).subscribe({
      next: (response) => {
        this.applyClientResults(response);
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('Error updating on-call entry:', err);
      },
    });
  }

  private applyClientResults(response: WorkChangeResource): void {
    if (!response.clientResults || !this.currentDate) return;

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

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
