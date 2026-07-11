// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for Holistic Harmonizer (LLM-driven schedule harmonizer). Starts an async run that
 * streams iteration progress over SignalR until completion, cancellation, or failure. The
 * accepted result can be applied as a new AnalyseScenario via the shared harmonizer apply pipeline.
 * @param phase - Derived UI phase (running/done/cancelled/applying/applied/error)
 * @param progressPercent - Iteration progress as a percentage of MaxIterations
 * @param fitnessDeltaPercent - Fitness improvement after - before, in percent
 */

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import {
  HolisticHarmonizerBatchDto,
  HolisticHarmonizerRunRequest,
} from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { QualificationGapReportComponent } from 'src/app/presentation/workplace/schedule/shared/qualification-gap-report/qualification-gap-report.component';

import { DomainMessages } from 'src/app/domain/constants/messages';
type HolisticHarmonizerPhase = 'running' | 'done' | 'applying' | 'applied' | 'cancelled' | 'error';

@Component({
  selector: 'app-holistic-harmonizer-dialog',
  templateUrl: './holistic-harmonizer-dialog.component.html',
  styleUrls: ['./holistic-harmonizer-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, QualificationGapReportComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolisticHarmonizerDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('holisticHarmonizerModal');

  private readonly ngbModal = inject(NgbModal);
  readonly holisticHarmonizerService = inject(DataHolisticHarmonizerService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly translate = inject(TranslateService);

  private readonly _applyPhase = signal<'applying' | 'applied' | null>(null);
  private readonly _localError = signal<string | null>(null);

  readonly appliedScenarioName = signal<string | null>(null);

  readonly selectedLlmModelId = computed(() => this.appSettings.holisticHarmonizerSettings().llmModelId);

  readonly phase = computed<HolisticHarmonizerPhase>(() => {
    const ap = this._applyPhase();
    if (ap !== null) return ap;
    if (this._localError() !== null) return 'error';
    switch (this.holisticHarmonizerService.status()) {
      case 'running':
        return 'running';
      case 'completed':
        return 'done';
      case 'cancelled':
        return 'cancelled';
      case 'failed':
        return 'error';
      default:
        return 'running';
    }
  });

  readonly errorMessage = computed(
    () => this._localError() ?? this.holisticHarmonizerService.failureReason() ?? '',
  );

  readonly progressPercent = computed(() => {
    const p = this.holisticHarmonizerService.progress();
    if (!p || p.maxIterations === 0) return 0;
    return Math.round((p.iterationIndex / p.maxIterations) * 100);
  });

  readonly progressBestFitnessPercent = computed(() => {
    const p = this.holisticHarmonizerService.progress();
    return p ? (p.bestFitness * 100).toFixed(1) : '0.0';
  });

  readonly progressElapsedSeconds = computed(() => {
    const p = this.holisticHarmonizerService.progress();
    return p ? (p.elapsedMs / 1000).toFixed(1) : '0.0';
  });

  readonly fitnessBeforePercent = computed(() => {
    const r = this.holisticHarmonizerService.result();
    return r ? (r.fitnessBefore * 100).toFixed(1) : '0.0';
  });

  readonly fitnessAfterPercent = computed(() => {
    const r = this.holisticHarmonizerService.result();
    return r ? (r.fitnessAfter * 100).toFixed(1) : '0.0';
  });

  readonly fitnessDeltaPercent = computed(() => {
    const r = this.holisticHarmonizerService.result();
    if (!r) return '0.0';
    return ((r.fitnessAfter - r.fitnessBefore) * 100).toFixed(1);
  });

  readonly acceptedCount = computed(() => this.holisticHarmonizerService.result()?.acceptedSwaps.length ?? 0);

  readonly rejectedCount = computed(() => this.holisticHarmonizerService.result()?.rejectedSwaps.length ?? 0);

  resolveAgentName(rowIndex: number): string {
    const names = this.holisticHarmonizerService.result()?.agentDisplayNames;
    if (names && rowIndex >= 0 && rowIndex < names.length) {
      return names[rowIndex];
    }
    return `r${rowIndex.toString().padStart(2, '0')}`;
  }

  batchScoreDeltaPercent(batch: HolisticHarmonizerBatchDto): string {
    return ((batch.scoreAfter - batch.scoreBefore) * 100).toFixed(2);
  }

  batchScoreDeltaSign(batch: HolisticHarmonizerBatchDto): 'positive' | 'negative' | 'neutral' {
    if (batch.scoreAfter > batch.scoreBefore) return 'positive';
    if (batch.scoreAfter < batch.scoreBefore) return 'negative';
    return 'neutral';
  }

  batchResultLabelKey(batch: HolisticHarmonizerBatchDto): string {
    switch (batch.result) {
      case 'Accepted':
        return 'holisticHarmonizer.dialog.batch-result-accepted';
      case 'PartiallyAccepted':
        return 'holisticHarmonizer.dialog.batch-result-partially-accepted';
      case 'WouldDegrade':
        return 'holisticHarmonizer.dialog.batch-result-would-degrade';
      case 'Rejected':
      default:
        return 'holisticHarmonizer.dialog.batch-result-rejected';
    }
  }

  batchResultCssClass(batch: HolisticHarmonizerBatchDto): string {
    switch (batch.result) {
      case 'Accepted':
        return 'holisticHarmonizer-batch-card--accepted';
      case 'PartiallyAccepted':
        return 'holisticHarmonizer-batch-card--partial';
      case 'WouldDegrade':
        return 'holisticHarmonizer-batch-card--degrade';
      case 'Rejected':
      default:
        return 'holisticHarmonizer-batch-card--rejected';
    }
  }

  private modalRef: NgbModalRef | null = null;

  open(): void {
    this._applyPhase.set(null);
    this._localError.set(null);
    this.appliedScenarioName.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });
    this.modalRef.dismissed.pipe(take(1)).subscribe(() => this.cancelIfRunning());

    if (!this.selectedLlmModelId()) {
      this._localError.set(this.translate.instant('holisticHarmonizer.dialog.error.noModel'));
      return;
    }

    const request = this.buildRequest();
    if (!request) {
      this._localError.set(this.translate.instant('holisticHarmonizer.dialog.error.noData'));
      return;
    }

    this.holisticHarmonizerService.start(request).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[HolisticHarmonizer] start() failed:', err);
      this._localError.set(message);
    });
  }

  onCancel(): void {
    this.cancelIfRunning();
  }

  onClose(): void {
    void this.holisticHarmonizerService.stopConnection();
    this.modalRef?.close();
  }

  async onApply(): Promise<void> {
    const jobId = this.holisticHarmonizerService.currentJobId();
    if (!jobId) return;
    this._applyPhase.set('applying');
    try {
      const groupId = this.dataManagementSchedule.workFilter.selectedGroup ?? null;
      const response = await this.holisticHarmonizerService.applyAsScenario(jobId, groupId);
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
      this.analyseScenarioService.scenarios.update((list) => [...list, newScenario]);
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
    const jobId = this.holisticHarmonizerService.currentJobId();
    if (jobId && this.holisticHarmonizerService.status() === 'running') {
      void this.holisticHarmonizerService.cancel(jobId);
    }
    void this.holisticHarmonizerService.stopConnection();
  }

  private buildRequest(): HolisticHarmonizerRunRequest | null {
    const start = this.dataManagementSchedule.periodStartDate;
    const end = this.dataManagementSchedule.periodEndDate;
    const clients = this.dataManagementSchedule.clients;

    if (!start || !end || !clients?.length) return null;

    return {
      periodFrom: formatDateOnly(start),
      periodUntil: formatDateOnly(end),
      agentIds: clients.map((c) => c.id),
      analyseToken: this.analyseScenarioService.activeToken(),
      language: this.translate.currentLang ?? DomainMessages.DEFAULT_LANG,
    };
  }
}
