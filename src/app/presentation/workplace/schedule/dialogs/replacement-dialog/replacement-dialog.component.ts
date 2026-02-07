/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Dialog component for creating and editing work replacements.
 * Allows assigning a replacement worker for part of a shift.
 * Includes client search and time range validation.
 *
 * @relations
 * - Opened by: ScheduleDialogService
 * - Uses: WorkChangeLogicService for time calculations
 * - Uses: DataWorkChangeService for API communication
 * - Counterpart: CorrectionDialogComponent
 */
import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { DataClientService, IClientForReplacement } from 'src/app/infrastructure/api/client/data-client.service';
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
  selector: 'app-replacement-dialog',
  templateUrl: './replacement-dialog.component.html',
  styleUrls: ['./replacement-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TimeInputComponent],
  providers: [WorkChangeLogicService],
})
export class ReplacementDialogComponent {
  @ViewChild('replacementModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private workChangeService = inject(DataManagementWorkchangeService);
  private clientService = inject(DataClientService);
  private logicService = inject(WorkChangeLogicService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  protected translate = inject(TranslateService);

  clients: IClientForReplacement[] = [];

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
  private editMode = false;
  private editId = '';
  isOpenedFromReplaceClient = false;
  workClientName = '';

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
    this.editMode = false;
    this.editId = '';
    this.workId = workId;
    this.currentClientId = currentClientId;
    this.currentDate = currentDate;
    this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);
    this.reset();
    this.loadClients(() => {
      this.modalRef = this.ngbModal.open(this.modalTemplate, {
        centered: true,
        backdrop: 'static',
      });
    });
  }

  openEdit(workChangeId: string, cellClientId: string, currentDate: Date): void {
    this.editMode = true;
    this.editId = workChangeId;
    this.currentDate = currentDate;

    this.loadClients(() => {
      this.workChangeService.get(workChangeId).subscribe({
        next: (data) => {
          this.workId = data.workId;
          this.currentClientId = data.work?.clientId || '';
          this.description = data.description || '';
          this.toInvoice = data.toInvoice;
          this.replaceClientId = data.replaceClientId;
          this.startTime = this.logicService.parseTimeString(data.startTime);
          this.endTime = this.logicService.parseTimeString(data.endTime);
          this.replacementMode = data.type === WorkChangeType.ReplacementStart
            ? CorrectionMode.AtStart
            : CorrectionMode.AtEnd;

          const workStartTime = data.work?.startTime || data.startTime;
          const workEndTime = data.work?.endTime || data.endTime;
          this.workContext = this.logicService.createWorkTimeContext(workStartTime, workEndTime);

          this.isOpenedFromReplaceClient = cellClientId === this.replaceClientId;

          if (this.replaceClientId) {
            const replaceClient = this.availableClients.find(c => c.id === this.replaceClientId);
            if (replaceClient) {
              this.searchText = this.getClientDisplayName(replaceClient);
            }
          }

          if (this.isOpenedFromReplaceClient && this.currentClientId) {
            const workClient = this.clients.find(c => c.id === this.currentClientId);
            if (workClient) {
              this.workClientName = this.getClientDisplayName(workClient);
            }
          }

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
    });
  }

  private loadClients(callback: () => void): void {
    this.clientService.getClientsForReplacement().subscribe({
      next: (clients) => {
        this.clients = clients;
        callback();
      },
      error: (err) => {
        console.error('Error loading clients for replacement:', err);
        this.clients = [];
        callback();
      },
    });
  }

  private reset(): void {
    this.replacementMode = CorrectionMode.AtStart;
    this.replaceClientId = null;
    this.searchText = '';
    this.searchResults = [];
    this.description = '';
    this.toInvoice = false;
    this.isOpenedFromReplaceClient = false;
    this.workClientName = '';
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
      replaceClientId: this.replaceClientId,
    };

    this.workChangeService.create(request).subscribe({
      next: (response) => {
        this.handleSaveResponse(response);
      },
      error: (err) => {
        console.error('Error creating replacement:', err);
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
      replaceClientId: this.replaceClientId,
    };

    this.workChangeService.update(resource).subscribe({
      next: (response) => {
        this.handleSaveResponse(response);
      },
      error: (err) => {
        console.error('Error updating replacement:', err);
      },
    });
  }

  private handleSaveResponse(response: WorkChangeResource): void {
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
  }

  onCancel(): void {
    this.modalRef?.dismiss();
  }
}
