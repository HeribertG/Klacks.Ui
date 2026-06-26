// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog component for creating and editing briefing and debriefing work time entries.
 * Supports two positions (AtStart for briefing, AtEnd for debriefing) with duration-only input.
 * Validates duration and builds the API request with startTime/endTime as "00:00".
 *
 * @param workId - ID of the work entry this briefing belongs to
 * @param clientId - ID of the client associated with the work entry
 * @param currentDate - The date of the work entry being modified
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
  selector: 'app-briefing-dialog',
  templateUrl: './briefing-dialog.component.html',
  styleUrls: ['./briefing-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('briefingModal');

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
  correctionMode = signal<CorrectionMode>(CorrectionMode.AtStart);
  durationMinutes = 15;
  duration: OwnTime = OwnTime.forDuration('00', '00');

  private formModel = signal<{ description: string; toInvoice: boolean }>({
    description: '',
    toInvoice: false,
  });
  protected briefingForm = form(this.formModel);

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
          toInvoice: false,
        });
        this.correctionMode.set(
          data.type === WorkChangeType.Debriefing
            ? CorrectionMode.AtEnd
            : CorrectionMode.AtStart,
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
    this.correctionMode.set(CorrectionMode.AtStart);
    this.durationMinutes = this.logicService.getDefaultDurationMinutes();
    this.formModel.set({ description: '', toInvoice: false });
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
      case CorrectionMode.AtStart: return WorkChangeType.Briefing;
      case CorrectionMode.AtEnd: return WorkChangeType.Debriefing;
      default: return WorkChangeType.Briefing;
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
        console.error('Error creating briefing entry:', err);
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
        console.error('Error updating briefing entry:', err);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
