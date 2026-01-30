import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataWorkChangeService } from 'src/app/infrastructure/api/data-work-change.service';
import {
  WorkChangeLogicService,
  CorrectionMode,
} from 'src/app/infrastructure/services/work-change-logic.service';
import {
  WorkChangeRequest,
  WorkChangeType,
  WorkChangeValidation,
  WorkTimeContext,
} from 'src/app/domain/models/work-change';
import { OwnTime } from 'src/app/domain/models/schedule-class';
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
  private workChangeService = inject(DataWorkChangeService);
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

  CorrectionMode = CorrectionMode;

  get isWithinMode(): boolean {
    return this.correctionMode === CorrectionMode.Within;
  }

  open(workId: string, clientId: string, currentDate: Date, workStartTime: string, workEndTime: string): void {
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

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
