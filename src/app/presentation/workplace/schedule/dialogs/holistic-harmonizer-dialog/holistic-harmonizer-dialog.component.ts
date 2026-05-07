// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for Holistic Harmonizer (LLM-driven schedule harmonizer) MVP. Runs a single LLM round-trip
 * on open, shows fitness before/after plus the accepted and rejected swaps with reasons,
 * and applies the result as a new AnalyseScenario via the shared harmonizer apply pipeline.
 * @param phase - Derived UI phase (running/done/applying/applied/error)
 * @param fitnessDeltaPercent - Fitness improvement after - before, in percent
 */

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { HolisticHarmonizerRunRequest } from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

type HolisticHarmonizerPhase = 'running' | 'done' | 'applying' | 'applied' | 'error';

@Component({
  selector: 'app-holistic-harmonizer-dialog',
  templateUrl: './holistic-harmonizer-dialog.component.html',
  styleUrls: ['./holistic-harmonizer-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolisticHarmonizerDialogComponent {
  @ViewChild('holisticHarmonizerModal') modalTemplate!: TemplateRef<unknown>;

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
      case 'failed':
        return 'error';
      default:
        return 'running';
    }
  });

  readonly errorMessage = computed(
    () => this._localError() ?? this.holisticHarmonizerService.failureReason() ?? '',
  );

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
    const clients = this.dataManagementSchedule.clients;
    if (!clients || rowIndex < 0 || rowIndex >= clients.length) {
      return `r${rowIndex.toString().padStart(2, '0')}`;
    }
    const c = clients[rowIndex];
    const parts = [c.name, c.firstName].filter(Boolean);
    return parts.length ? parts.join(', ') : c.id;
  }

  private modalRef: NgbModalRef | null = null;

  open(): void {
    this._applyPhase.set(null);
    this._localError.set(null);
    this.appliedScenarioName.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
    });

    if (!this.selectedLlmModelId()) {
      this._localError.set(this.translate.instant('holisticHarmonizer.dialog.error.noModel'));
      return;
    }

    const request = this.buildRequest();
    if (!request) {
      this._localError.set(this.translate.instant('holisticHarmonizer.dialog.error.noData'));
      return;
    }

    this.holisticHarmonizerService.run(request).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[HolisticHarmonizer] run() failed:', err);
      this._localError.set(message);
    });
  }

  onClose(): void {
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

  private buildRequest(): HolisticHarmonizerRunRequest | null {
    const start = this.dataManagementSchedule.visibleStartDate;
    const end = this.dataManagementSchedule.visibleEndDate;
    const clients = this.dataManagementSchedule.clients;

    if (!start || !end || !clients?.length) return null;

    return {
      periodFrom: formatDateOnly(start),
      periodUntil: formatDateOnly(end),
      agentIds: clients.map((c) => c.id),
      analyseToken: this.analyseScenarioService.activeToken(),
      language: this.translate.currentLang ?? 'en',
    };
  }
}
