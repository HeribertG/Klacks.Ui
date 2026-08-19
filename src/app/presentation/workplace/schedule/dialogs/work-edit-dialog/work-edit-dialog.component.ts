// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for editing the start time, end time and description of an existing work entry.
 * @param options.workId - ID of the work entry being edited
 * @param options.lockLevel - Lock level of the loaded entry, carried unchanged into the update so an
 *   edit can never unseal a confirmed/approved entry (only the seal actions may change it)
 * @param options.surcharges - Surcharge value of the loaded entry, carried unchanged into the update
 *   so an edit can never silently zero it out
 */
import { ChangeDetectionStrategy, Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { workingTimeDurationMinutes } from 'src/app/shared/helpers/time-format.helper';
import { Work } from 'src/app/domain/models/schedule/schedule-class';

interface WorkEditValidation {
  isValid: boolean;
  durationMinutes: number;
  errorKey?: string;
}

export interface IOpenWorkEditOptions {
  workId: string;
  clientId: string;
  shiftId: string;
  currentDate: Date;
  workStartTime: string;
  workEndTime: string;
  information: string | null;
  lockLevel: number;
  surcharges: number;
}

@Component({
  selector: 'app-work-edit-dialog',
  templateUrl: './work-edit-dialog.component.html',
  styleUrls: ['./work-edit-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule, TimeInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkEditDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('workEditModal');

  private ngbModal = inject(NgbModal);
  private dataScheduleService = inject(DataScheduleService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);

  workId = '';
  clientId = '';
  shiftId = '';
  currentDate: Date | null = null;
  originalCurrentDate: Date | null = null;
  startTime: OwnTime = OwnTime.forTime('00', '00');
  endTime: OwnTime = OwnTime.forTime('00', '00');
  originalStartTime: OwnTime = OwnTime.forTime('00', '00');
  duration: OwnTime = OwnTime.forDuration('00', '00');

  private lockLevel = 0;
  private surcharges = 0;

  private formModel = signal<{ description: string }>({ description: '' });
  protected workEditForm = form(this.formModel);

  validation: WorkEditValidation = { isValid: false, durationMinutes: 0 };

  private modalRef: NgbModalRef | null = null;

  private readonly MAX_DURATION_MINUTES = 24 * 60;

  open(options: IOpenWorkEditOptions): void {
    this.workId = options.workId;
    this.clientId = options.clientId;
    this.shiftId = options.shiftId;
    this.currentDate = options.currentDate;
    this.originalCurrentDate = new Date(options.currentDate);
    this.startTime = this.parseTimeString(options.workStartTime);
    this.endTime = this.parseTimeString(options.workEndTime);
    this.originalStartTime = this.parseTimeString(options.workStartTime);
    this.lockLevel = options.lockLevel;
    this.surcharges = options.surcharges;
    this.formModel.set({ description: options.information || '' });
    this.recalculate();

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
    });
  }

  onTimeChange(): void {
    this.adjustCurrentDateForMidnightCrossing();
    this.recalculate();
  }

  private adjustCurrentDateForMidnightCrossing(): void {
    if (!this.originalCurrentDate) return;

    const originalStartMinutes = this.originalStartTime.toMinutes();
    const newStartMinutes = this.startTime.toMinutes();

    const MIDDAY = 12 * 60;

    if (originalStartMinutes < MIDDAY && newStartMinutes >= MIDDAY) {
      this.currentDate = addDays(this.originalCurrentDate, -1);
    } else if (originalStartMinutes >= MIDDAY && newStartMinutes < MIDDAY) {
      this.currentDate = addDays(this.originalCurrentDate, 1);
    } else {
      this.currentDate = new Date(this.originalCurrentDate);
    }
  }

  private recalculate(): void {
    const startMinutes = this.startTime.toMinutes();
    const endMinutes = this.endTime.toMinutes();

    const durationMinutes = workingTimeDurationMinutes(startMinutes, endMinutes);

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    this.duration = OwnTime.forDuration(
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
    );

    this.validation = this.validate(durationMinutes);
  }

  private validate(durationMinutes: number): WorkEditValidation {
    if (durationMinutes <= 0) {
      return {
        isValid: false,
        durationMinutes,
        errorKey: 'dialog.workEdit.error.invalidTime',
      };
    }

    if (durationMinutes > this.MAX_DURATION_MINUTES) {
      return {
        isValid: false,
        durationMinutes,
        errorKey: 'dialog.workEdit.error.maxDuration',
      };
    }

    return { isValid: true, durationMinutes };
  }

  isValid(): boolean {
    return this.validation.isValid;
  }

  onSave(): void {
    if (!this.isValid() || !this.currentDate) return;

    const work = new Work();
    work.id = this.workId;
    work.clientId = this.clientId;
    work.shiftId = this.shiftId;
    work.currentDate = this.currentDate;
    work.startTime = this.ownTimeToString(this.startTime);
    work.endTime = this.ownTimeToString(this.endTime);
    work.workTime = this.validation.durationMinutes / 60;
    work.information = this.formModel().description || undefined;
    work.lockLevel = this.lockLevel;
    work.surcharges = this.surcharges;

    if (this.workScheduleLoader.startDate && this.workScheduleLoader.endDate) {
      work.periodStart = formatDateOnly(this.workScheduleLoader.startDate);
      work.periodEnd = formatDateOnly(this.workScheduleLoader.endDate);
    }

    this.dataScheduleService.updateWork(work).subscribe({
      next: (response) => {
        if (response.periodHours) {
          this.workScheduleLoader.periodHours.set(this.clientId, response.periodHours);
        }

        if (response.scheduleEntries && this.currentDate) {
          const startDate = addDays(this.currentDate, -1);
          const endDate = addDays(this.currentDate, 1);
          this.workScheduleLoader.replaceClientEntriesForDays(
            this.clientId,
            startDate,
            endDate,
            response.scheduleEntries,
          );
        }

        this.workScheduleLoader.updateClientNeededRows();
        this.scheduleEntryCrud.triggerScheduleRefresh();
        this.modalRef?.close();
      },
      error: (err) => {
        console.error('Error updating work:', err);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }

  private parseTimeString(time: string): OwnTime {
    if (!time) return OwnTime.forTime('00', '00');
    const parts = time.split(':');
    if (parts.length >= 2) {
      return OwnTime.forTime(parts[0], parts[1]);
    }
    return OwnTime.forTime('00', '00');
  }

  private ownTimeToString(time: OwnTime): string {
    return `${time.hours}:${time.minutes}:00`;
  }
}
