// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog component for the schedule harmonizer (Wizard 2). Streams optimisation progress
 * via SignalR, displays per-row before/after harmony scores, and applies the harmonised
 * arrangement as a new AnalyseScenario on user confirmation.
 * @param phase - Derived UI phase (running/done/applying/applied/error/cancelled)
 * @param progressPercent - Integer 0–100 derived from current generation / max generations
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
import { take } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataHarmonizerService } from 'src/app/infrastructure/api/harmonizer/data-harmonizer.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { HarmonizerRequest } from 'src/app/domain/models/harmonizer/harmonizer-request.model';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

type HarmonizerPhase = 'running' | 'done' | 'applying' | 'applied' | 'error' | 'cancelled';

@Component({
  selector: 'app-harmonizer-dialog',
  templateUrl: './harmonizer-dialog.component.html',
  styleUrls: ['./harmonizer-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarmonizerDialogComponent {
  @ViewChild('harmonizerModal') modalTemplate!: TemplateRef<unknown>;

  private readonly ngbModal = inject(NgbModal);
  readonly harmonizerService = inject(DataHarmonizerService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly translate = inject(TranslateService);

  private readonly _applyPhase = signal<'applying' | 'applied' | null>(null);
  private readonly _localError = signal<string | null>(null);

  readonly appliedScenarioName = signal<string | null>(null);

  readonly phase = computed<HarmonizerPhase>(() => {
    const ap = this._applyPhase();
    if (ap !== null) return ap;
    if (this._localError() !== null) return 'error';
    switch (this.harmonizerService.status()) {
      case 'running':   return 'running';
      case 'completed': return 'done';
      case 'cancelled': return 'cancelled';
      case 'failed':    return 'error';
      default:          return 'running';
    }
  });

  readonly errorMessage = computed(() =>
    this._localError() ?? this.harmonizerService.failureReason() ?? '');

  readonly progressPercent = computed(() => {
    const p = this.harmonizerService.progress();
    if (!p || p.maxGenerations === 0) return 0;
    return Math.round((p.generation / p.maxGenerations) * 100);
  });

  readonly bestFitnessPercent = computed(() => {
    const p = this.harmonizerService.progress();
    return p ? (p.bestFitness * 100).toFixed(1) : '0.0';
  });

  readonly fitnessDeltaPercent = computed(() => {
    const r = this.harmonizerService.result();
    if (!r) return '0.0';
    return ((r.globalFitnessAfter - r.globalFitnessBefore) * 100).toFixed(1);
  });

  formatScore(value: number): string {
    return (value * 100).toFixed(1);
  }

  resolveAgentName(agentId: string): string {
    const c = this.dataManagementSchedule.clients?.find(cl => cl.id === agentId);
    if (!c) return agentId;
    const parts = [c.name, c.firstName].filter(Boolean);
    return parts.length ? parts.join(', ') : agentId;
  }

  private modalRef: NgbModalRef | null = null;

  open(): void {
    this._applyPhase.set(null);
    this._localError.set(null);
    this.appliedScenarioName.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true, backdrop: 'static', keyboard: false, size: 'lg',
    });
    this.modalRef.dismissed.pipe(take(1)).subscribe(() => this.cancelIfRunning());

    const request = this.buildRequest();
    if (!request) {
      if (this._localError() === null) {
        this._localError.set(this.translate.instant('harmonizer.dialog.error.noData'));
      }
      return;
    }
    this.harmonizerService.start(request).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Harmonizer] start() failed:', err);
      this._localError.set(message);
    });
  }

  onCancel(): void {
    this.cancelIfRunning();
    this.modalRef?.close();
  }

  onClose(): void {
    void this.harmonizerService.stopConnection();
    this.modalRef?.close();
  }

  async onApply(): Promise<void> {
    const jobId = this.harmonizerService.currentJobId();
    if (!jobId) return;
    this._applyPhase.set('applying');
    try {
      const groupId = this.dataManagementSchedule.workFilter.selectedGroup ?? null;
      const response = await this.harmonizerService.applyAsScenario(jobId, groupId);
      const newScenario = {
        id: response.scenarioId,
        name: response.scenarioName,
        token: response.scenarioToken,
        runGroupId: response.runGroupId,
        fromDate: '',
        untilDate: '',
        createdByUser: '',
        status: AnalyseScenarioStatus.Active,
      };
      this.analyseScenarioService.scenarios.update(list => [...list, newScenario]);
      this.analyseScenarioService.selectScenario(newScenario);
      this.appliedScenarioName.set(response.scenarioName);
      this._applyPhase.set('applied');
      this.dataManagementSchedule.readDatas();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._localError.set(message);
      this._applyPhase.set(null);
    }
  }

  private cancelIfRunning(): void {
    const jobId = this.harmonizerService.currentJobId();
    if (jobId && this.harmonizerService.status() === 'running') {
      void this.harmonizerService.cancel(jobId);
    }
    void this.harmonizerService.stopConnection();
  }

  private buildRequest(): HarmonizerRequest | null {
    const start   = this.dataManagementSchedule.periodStartDate;
    const end     = this.dataManagementSchedule.periodEndDate;
    const clients = this.dataManagementSchedule.clients;

    if (!start || !end || !clients?.length) return null;

    return {
      periodFrom:   formatDateOnly(start),
      periodUntil:  formatDateOnly(end),
      agentIds:     clients.map(c => c.id),
      analyseToken: this.analyseScenarioService.activeToken(),
    };
  }
}
