// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { Work } from 'src/app/domain/models/schedule/schedule-class';

interface WorkEditValidation {
  isValid: boolean;
  durationMinutes: number;
  errorKey?: string;
}

@Component({
  selector: 'app-work-edit-dialog',
  templateUrl: './work-edit-dialog.component.html',
  styleUrls: ['./work-edit-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TimeInputComponent],
})
export class WorkEditDialogComponent {
  @ViewChild('workEditModal') modalTemplate!: TemplateRef<unknown>;

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
  description = '';

  validation: WorkEditValidation = { isValid: false, durationMinutes: 0 };

  private modalRef: NgbModalRef | null = null;

  private readonly MAX_DURATION_MINUTES = 20 * 60;

  open(
    workId: string,
    clientId: string,
    shiftId: string,
    currentDate: Date,
    workStartTime: string,
    workEndTime: string,
    information: string | null,
  ): void {
    this.workId = workId;
    this.clientId = clientId;
    this.shiftId = shiftId;
    this.currentDate = currentDate;
    this.originalCurrentDate = new Date(currentDate);
    this.startTime = this.parseTimeString(workStartTime);
    this.endTime = this.parseTimeString(workEndTime);
    this.originalStartTime = this.parseTimeString(workStartTime);
    this.description = information || '';
    this.recalculate();

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
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

    let durationMinutes: number;
    if (endMinutes >= startMinutes) {
      durationMinutes = endMinutes - startMinutes;
    } else {
      durationMinutes = 24 * 60 - startMinutes + endMinutes;
    }

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
    work.information = this.description || undefined;
    work.surcharges = 0;

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
