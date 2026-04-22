// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog component for the shift scheduling wizard powered by the C# backend GA engine.
 * @param phase - Derived phase (running/done/applying/applied/error/cancelled)
 * @param progressPercent - Integer 0–100 derived from SignalR progress events
 * @param sortedTokenRows - Resolved assignment rows sorted by date
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DataWizardService } from 'src/app/infrastructure/api/wizard/data-wizard.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { WizardRequest } from 'src/app/domain/models/wizard/wizard-request.model';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

type WizardPhase = 'running' | 'done' | 'applying' | 'applied' | 'error' | 'cancelled';

@Component({
  selector: 'app-wizard-dialog',
  templateUrl: './wizard-dialog.component.html',
  styleUrls: ['./wizard-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardDialogComponent {
  @ViewChild('wizardModal') modalTemplate!: TemplateRef<unknown>;

  private readonly ngbModal = inject(NgbModal);
  readonly wizardService = inject(DataWizardService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);

  private readonly _applyPhase = signal<'applying' | 'applied' | null>(null);
  private readonly _localError = signal<string | null>(null);

  readonly appliedCount = signal(0);

  readonly phase = computed<WizardPhase>(() => {
    const ap = this._applyPhase();
    if (ap !== null) return ap;
    if (this._localError() !== null) return 'error';
    switch (this.wizardService.status()) {
      case 'running':   return 'running';
      case 'completed': return 'done';
      case 'cancelled': return 'cancelled';
      case 'failed':    return 'error';
      default:          return 'running';
    }
  });

  readonly errorMessage = computed(() =>
    this._localError() ?? this.wizardService.failureReason() ?? '');

  readonly progressPercent = computed(() => {
    const p = this.wizardService.progress();
    if (!p || p.maxGenerations === 0) return 0;
    return Math.round((p.generation / p.maxGenerations) * 100);
  });

  readonly sortedTokenRows = computed(() => {
    const result = this.wizardService.result();
    if (!result?.tokens?.length) return [];

    const clients   = this.dataManagementSchedule.clients;
    const schedules = this.dataManagementSchedule.shiftSchedules;

    return result.tokens
      .map(t => ({
        date:      t.date,
        shiftName: schedules.find(s => s.shiftId === t.shiftId)?.shiftName ?? t.shiftId,
        agentName: this.resolveAgentName(clients, t.agentId),
        hours:     t.hours,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  private modalRef: NgbModalRef | null = null;

  open(): void {
    this._applyPhase.set(null);
    this._localError.set(null);
    this.appliedCount.set(0);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true, backdrop: 'static', keyboard: false, size: 'lg',
    });
    this.modalRef.dismissed.subscribe(() => this.cancelIfRunning());

    const request = this.buildRequest();
    if (!request) {
      this._localError.set('No shifts or clients available for scheduling');
      return;
    }
    void this.wizardService.start(request);
  }

  onCancel(): void {
    this.cancelIfRunning();
    this.modalRef?.close();
  }

  onClose(): void {
    void this.wizardService.stopConnection();
    this.modalRef?.close();
  }

  async onApply(): Promise<void> {
    const jobId = this.wizardService.currentJobId();
    if (!jobId) return;
    this._applyPhase.set('applying');
    try {
      const ids = await this.wizardService.apply(jobId);
      this.appliedCount.set(ids.length);
      this._applyPhase.set('applied');
      this.dataManagementSchedule.readDatas();
    } catch (err) {
      this._applyPhase.set(null);
      this._localError.set(err instanceof Error ? err.message : 'Failed to apply schedule');
    }
  }

  formatHours(value: number): string {
    return value.toFixed(1);
  }

  private cancelIfRunning(): void {
    const jobId = this.wizardService.currentJobId();
    if (jobId && this.wizardService.status() === 'running') {
      void this.wizardService.cancel(jobId);
    }
    void this.wizardService.stopConnection();
  }

  private resolveAgentName(clients: IClientWork[], agentId: string): string {
    const c = clients.find(cl => cl.id === agentId);
    if (!c) return agentId;
    const parts = [c.name, c.firstName].filter(Boolean);
    return parts.length ? parts.join(', ') : agentId;
  }

  private buildRequest(): WizardRequest | null {
    const start   = this.dataManagementSchedule.visibleStartDate;
    const end     = this.dataManagementSchedule.visibleEndDate;
    const clients = this.dataManagementSchedule.clients;
    const shifts  = this.dataManagementSchedule.shiftSchedules;

    if (!start || !end || !clients.length || !shifts.length) return null;

    return {
      periodFrom:   formatDateOnly(start),
      periodUntil:  formatDateOnly(end),
      agentIds:     clients.map(c => c.id),
      shiftIds:     [...new Set(shifts.map(s => s.shiftId))],
      analyseToken: null,
    };
  }
}
