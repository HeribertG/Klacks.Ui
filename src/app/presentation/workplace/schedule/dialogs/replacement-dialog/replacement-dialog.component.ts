import { Component, inject, Input, TemplateRef, ViewChild } from '@angular/core';
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

export interface IClientForReplacement {
  id: string;
  name?: string;
  firstName?: string;
  company?: string;
  legalEntity: boolean;
  idNumber: number;
}

@Component({
  selector: 'app-replacement-dialog',
  templateUrl: './replacement-dialog.component.html',
  styleUrls: ['./replacement-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
})
export class ReplacementDialogComponent {
  @ViewChild('replacementModal') modalTemplate!: TemplateRef<unknown>;
  @Input() clients: IClientForReplacement[] = [];

  private ngbModal = inject(NgbModal);
  private workChangeService = inject(DataWorkChangeService);
  private logicService = inject(WorkChangeLogicService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);

  workId = '';
  currentClientId = '';
  currentDate: Date | null = null;
  replacementMode: CorrectionMode = CorrectionMode.AtStart;
  replaceClientId: string | null = null;
  searchText = '';
  searchResults: IClientForReplacement[] = [];
  startTime: OwnTime = OwnTime.forTime('00', '00');
  endTime: OwnTime = OwnTime.forTime('00', '00');
  duration: OwnTime = OwnTime.forDuration('00', '00');
  description = '';
  toInvoice = false;

  workContext: WorkTimeContext | null = null;
  validation: WorkChangeValidation = { isValid: false, changeTime: 0 };

  private modalRef: NgbModalRef | null = null;

  CorrectionMode = CorrectionMode;

  get availableClients(): IClientForReplacement[] {
    return this.clients.filter((c) => c.id !== this.currentClientId);
  }

  get isWithinMode(): boolean {
    return this.replacementMode === CorrectionMode.Within;
  }

  get isStartTimeDisabled(): boolean {
    return this.replacementMode === CorrectionMode.AtStart;
  }

  get isEndTimeDisabled(): boolean {
    return this.replacementMode === CorrectionMode.AtEnd;
  }

  get selectedClient(): IClientForReplacement | null {
    if (!this.replaceClientId) return null;
    return this.availableClients.find((c) => c.id === this.replaceClientId) || null;
  }

  open(workId: string, currentClientId: string, currentDate: Date, workStartTime: string, workEndTime: string): void {
    this.workId = workId;
    this.currentClientId = currentClientId;
    this.currentDate = currentDate;
    this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);
    this.reset();
    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
    });
  }

  private reset(): void {
    this.replacementMode = CorrectionMode.AtStart;
    this.replaceClientId = null;
    this.searchText = '';
    this.searchResults = [];
    this.description = '';
    this.toInvoice = false;
    this.onModeChange();
  }

  onModeChange(): void {
    if (this.workContext) {
      const defaults = this.logicService.getDefaultTimesForReplacementMode(this.replacementMode, this.workContext);
      this.startTime = defaults.startTime;
      this.endTime = defaults.endTime;
    }
    this.recalculate();
  }

  onStartTimeChange(): void {
    if (this.workContext && this.replacementMode === CorrectionMode.AtStart) {
      this.startTime = this.logicService.minutesToOwnTime(
        this.logicService.parseTimeToMinutes(this.workContext.workStartTime)
      );
    }
    this.recalculate();
  }

  onEndTimeChange(): void {
    if (this.workContext && this.replacementMode === CorrectionMode.AtEnd) {
      this.endTime = this.logicService.minutesToOwnTime(
        this.logicService.parseTimeToMinutes(this.workContext.workEndTime)
      );
    }
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

    this.validation = this.logicService.validateReplacementMode(
      this.startTime,
      this.endTime,
      this.workContext,
      this.replacementMode
    );
  }

  onSearchKeyup(): void {
    if (!this.searchText || this.searchText.length < 1) {
      this.searchResults = [];
      return;
    }

    const searchLower = this.searchText.toLowerCase();
    this.searchResults = this.availableClients.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const firstName = (c.firstName || '').toLowerCase();
      const company = (c.company || '').toLowerCase();
      const idNumber = c.idNumber.toString();

      return (
        name.includes(searchLower) ||
        firstName.includes(searchLower) ||
        company.includes(searchLower) ||
        idNumber.includes(searchLower)
      );
    });
  }

  onSelectClient(client: IClientForReplacement): void {
    this.replaceClientId = client.id;
    this.searchText = this.getClientDisplayName(client);
    this.searchResults = [];
  }

  isValid(): boolean {
    return this.validation.isValid && this.replaceClientId !== null;
  }

  getClientDisplayName(client: IClientForReplacement): string {
    if (client.legalEntity && client.company) {
      return `${client.idNumber} - ${client.company}`;
    }
    const parts = [client.name, client.firstName].filter(Boolean);
    return `${client.idNumber} - ${parts.join(' ')}`;
  }

  private mapModeToWorkChangeType(): WorkChangeType {
    switch (this.replacementMode) {
      case CorrectionMode.AtStart:
        return WorkChangeType.ReplacementStart;
      case CorrectionMode.AtEnd:
      case CorrectionMode.Within:
        return WorkChangeType.ReplacementEnd;
      default:
        return WorkChangeType.ReplacementStart;
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
      replaceClientId: this.replaceClientId,
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
        console.error('Error creating replacement:', err);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
