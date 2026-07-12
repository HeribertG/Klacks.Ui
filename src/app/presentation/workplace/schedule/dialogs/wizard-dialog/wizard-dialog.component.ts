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
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { take } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataWizardService } from 'src/app/infrastructure/api/wizard/data-wizard.service';
import { WIZARD_LIMITS } from 'src/app/infrastructure/api/wizard/wizard-limits.constants';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { WizardRequest } from 'src/app/domain/models/wizard/wizard-request.model';
import { WizardResult } from 'src/app/domain/models/wizard/wizard-progress.model';
import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/infrastructure/constants/storage-keys';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { QualificationGapReportComponent } from 'src/app/presentation/workplace/schedule/shared/qualification-gap-report/qualification-gap-report.component';

type WizardPhase = 'running' | 'done' | 'applying' | 'applied' | 'error' | 'cancelled';

@Component({
  selector: 'app-wizard-dialog',
  templateUrl: './wizard-dialog.component.html',
  styleUrls: ['./wizard-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, ScrollingModule, TranslateModule, QualificationGapReportComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('wizardModal');

  private readonly ngbModal = inject(NgbModal);
  readonly wizardService = inject(DataWizardService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly translate = inject(TranslateService);
  private readonly localStorageService = inject(LocalStorageService);

  private readonly _applyPhase = signal<'applying' | 'applied' | null>(null);
  private readonly _localError = signal<string | null>(null);
  private readonly _applyError = signal<string | null>(null);
  readonly applyError = this._applyError.asReadonly();

  private startPromise: Promise<string> | null = null;

  readonly appliedCount = signal(0);

  private static readonly AUCTION_RATIO_DEFAULT = 0.5;
  readonly auctionRatio = signal<number>(WizardDialogComponent.AUCTION_RATIO_DEFAULT);
  readonly auctionRatioPercent = computed(() => Math.round(this.auctionRatio() * 100));

  constructor() {
    this.auctionRatio.set(this.loadAuctionRatio());
  }

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
    const awardKey = (date: string, agentId: string) => `${date}|${agentId}`;
    const awardMap = new Map<string, string[]>();
    const escalationMap = new Map<string, string>();

    if (result.awards) {
      for (const a of result.awards) {
        awardMap.set(awardKey(a.date, a.agentId), a.firedRules.slice(0, 3));
      }
    }
    if (result.escalations) {
      for (const e of result.escalations) {
        escalationMap.set(awardKey(e.date, e.agentId), `${e.ruleName}: ${e.hint}`);
      }
    }

    const shiftNameById = new Map<string, string>();
    for (const s of schedules) {
      if (!shiftNameById.has(s.shiftId)) {
        shiftNameById.set(s.shiftId, s.shiftName);
      }
    }
    const agentNameById = new Map<string, string>();
    for (const c of clients) {
      const parts = [c.name, c.firstName].filter(Boolean);
      agentNameById.set(c.id, parts.length ? parts.join(', ') : c.id);
    }

    return result.tokens
      .map(t => {
        const key = awardKey(t.date, t.agentId);
        const escalation = escalationMap.get(key);
        const firedRules = awardMap.get(key) ?? [];
        return {
          date:      t.date,
          shiftName: shiftNameById.get(t.shiftId) ?? t.shiftId,
          agentName: agentNameById.get(t.agentId) ?? t.agentId,
          hours:     t.hours,
          firedRules,
          escalation: escalation ? this.shortenEscalation(escalation) : '',
          reasonDetails: escalation ?? firedRules.join('\n'),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  private static readonly RESULT_ROW_HEIGHT_PX = 32;
  private static readonly RESULT_VIEWPORT_MAX_HEIGHT_PX = 340;

  readonly resultRowHeight = WizardDialogComponent.RESULT_ROW_HEIGHT_PX;

  readonly resultViewportHeight = computed(() =>
    Math.min(
      this.sortedTokenRows().length * WizardDialogComponent.RESULT_ROW_HEIGHT_PX,
      WizardDialogComponent.RESULT_VIEWPORT_MAX_HEIGHT_PX,
    ));

  readonly trackRow = (_: number, row: { date: string; agentName: string; shiftName: string }): string =>
    `${row.date}|${row.agentName}|${row.shiftName}`;

  escalationCount(result: WizardResult): number {
    return result.escalations?.length ?? 0;
  }

  readonly qualificationGaps = computed<QualificationGapDetail[]>(() => {
    const gaps = this.wizardService.result()?.qualificationGaps ?? [];
    if (gaps.length === 0) return [];
    const clients = this.dataManagementSchedule.clients;
    return gaps.map((g) =>
      g.agentId && !g.agentName
        ? { ...g, agentName: this.resolveAgentName(clients, g.agentId) }
        : g,
    );
  });

  private shortenEscalation(full: string): string {
    const colon = full.indexOf(':');
    return colon > 0 ? full.substring(0, colon) : full;
  }

  private modalRef: NgbModalRef | null = null;

  open(): void {
    this._applyPhase.set(null);
    this._localError.set(null);
    this._applyError.set(null);
    this.appliedCount.set(0);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true, backdrop: 'static', keyboard: false, size: 'lg',
    });
    this.modalRef.dismissed.pipe(take(1)).subscribe(() => this.cancelIfRunning());

    const request = this.buildRequest();
    if (!request) {
      if (this._localError() === null) {
        this._localError.set(this.translate.instant('wizard.dialog.error.noData'));
      }
      return;
    }
    this.startRun(request);
  }

  private startRun(request: WizardRequest): void {
    this.startPromise = this.wizardService.start(request);
    this.startPromise.catch((err: unknown) => {
      this._localError.set(err instanceof Error ? err.message : String(err));
    });
  }

  onCancel(): void {
    this.cancelIfRunning();
    this.modalRef?.close();
  }

  onClose(): void {
    void this.wizardService.stopConnection();
    this.modalRef?.close();
  }

  onAuctionRatioChange(percent: number): void {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const ratio = clamped / 100;
    this.auctionRatio.set(ratio);
    try {
      this.localStorageService.set(StorageKeys.WIZARD_AUCTION_RATIO, ratio.toString());
    } catch {
      // localStorage may be disabled — ignore.
    }
  }

  async onRetryRun(): Promise<void> {
    this._applyPhase.set(null);
    this._localError.set(null);
    this._applyError.set(null);
    this.appliedCount.set(0);
    await this.wizardService.stopConnection();
    const request = this.buildRequest();
    if (!request) {
      if (this._localError() === null) {
        this._localError.set(this.translate.instant('wizard.dialog.error.noData'));
      }
      return;
    }
    this.startRun(request);
  }

  private loadAuctionRatio(): number {
    try {
      const raw = this.localStorageService.get(StorageKeys.WIZARD_AUCTION_RATIO);
      if (raw === null) return WizardDialogComponent.AUCTION_RATIO_DEFAULT;
      const parsed = parseFloat(raw);
      if (!Number.isFinite(parsed)) return WizardDialogComponent.AUCTION_RATIO_DEFAULT;
      return Math.max(0, Math.min(1, parsed));
    } catch {
      return WizardDialogComponent.AUCTION_RATIO_DEFAULT;
    }
  }

  async onApply(): Promise<void> {
    if (this._applyPhase() !== null) return;
    const jobId = this.wizardService.currentJobId();
    if (!jobId) return;
    this._applyError.set(null);
    this._applyPhase.set('applying');
    try {
      if (this.analyseScenarioService.isScenarioMode()) {
        const ids = await this.wizardService.apply(jobId);
        this.appliedCount.set(ids.length);
      } else {
        const groupId = this.dataManagementSchedule.workFilter.selectedGroup ?? null;
        const result = await this.wizardService.applyAsScenario(jobId, groupId);
        const newScenario = {
          id: result.scenarioId,
          name: result.scenarioName,
          token: result.scenarioToken,
          runGroupId: result.runGroupId,
          fromDate: '',
          untilDate: '',
          createdByUser: '',
          status: AnalyseScenarioStatus.Active,
        };
        this.analyseScenarioService.scenarios.update(list => [...list, newScenario]);
        this.analyseScenarioService.selectScenario(newScenario);
        this.appliedCount.set(result.createdWorkIds.length);
      }
      this._applyPhase.set('applied');
      this.dataManagementSchedule.readDatas();
    } catch (err) {
      this._applyPhase.set(null);
      this._applyError.set(err instanceof Error ? err.message : 'Failed to apply schedule');
    }
  }

  formatHours(value: number): string {
    return value.toFixed(1);
  }

  shiftCoveragePercent(result: WizardResult): string {
    if (!result.availableShiftSlots) return '0.0';
    return ((result.tokenCount / result.availableShiftSlots) * 100).toFixed(1);
  }

  private cancelIfRunning(): void {
    if (this.wizardService.status() === 'running') {
      const jobId = this.wizardService.currentJobId();
      if (jobId) {
        this.wizardService.cancel(jobId).catch(() => undefined);
      } else {
        this.startPromise
          ?.then((startedJobId) => this.wizardService.cancel(startedJobId))
          .catch(() => undefined)
          .then(() => this.wizardService.stopConnection())
          .catch(() => undefined);
      }
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
    const start   = this.dataManagementSchedule.periodStartDate;
    const end     = this.dataManagementSchedule.periodEndDate;
    const clients = this.dataManagementSchedule.clients;
    const shifts  = this.dataManagementSchedule.shiftSchedules;

    if (!start || !end || !clients.length || !shifts.length) return null;

    const allAgentIds = clients.map(c => c.id);
    const allShiftIds = [...new Set(shifts.map(s => s.shiftId))];

    if (allAgentIds.length > WIZARD_LIMITS.maxAgents
        || allShiftIds.length > WIZARD_LIMITS.maxShifts) {
      this._localError.set(this.translate.instant('wizard.dialog.error.tooLarge', {
        agents: allAgentIds.length,
        shifts: allShiftIds.length,
        maxAgents: WIZARD_LIMITS.maxAgents,
        maxShifts: WIZARD_LIMITS.maxShifts,
      }));
      return null;
    }

    return {
      periodFrom:   formatDateOnly(start),
      periodUntil:  formatDateOnly(end),
      agentIds:     allAgentIds,
      shiftIds:     allShiftIds,
      analyseToken: this.analyseScenarioService.activeToken(),
      trainingOverrides: { initAuctionRatio: this.auctionRatio() },
      agentOrderIsUserDefined: this.dataManagementSchedule.isIndividualClientSortActive,
    };
  }
}
