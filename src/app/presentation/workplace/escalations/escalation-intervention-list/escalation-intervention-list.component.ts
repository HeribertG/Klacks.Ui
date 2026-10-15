// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Page for the escalation intervention list, open to every signed-in planner: the currently Running escalation
 * chains the server lets the viewer see (group visibility; administrators see all), who was woken, who
 * acknowledged, and the two actions that resolve a chain - "übernehmen" (only shown when the viewer currently holds
 * the Notified stage on that specific chain) and "abbrechen" (Owner decision B7: mandatory reason, only shown when the
 * server marks the chain cancellable for the viewer: administrator, supervisor or member of that chain's roster). A take-over answered with
 * 409 means the row is stale, so it gets a toast and a refresh instead of the generic error, because
 * retrying would never succeed. Which toast depends on the response body: only an Exhausted chain means
 * the deadline lapsed unanswered; Acknowledged, Cancelled and Superseded mean somebody else resolved it,
 * and a still-Running chain means the stage moved on to the next rank - telling any of those three that
 * "nobody approved, delegate it" would be plainly false.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  viewChild,
  TemplateRef,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DataManagementEscalationChainService } from 'src/app/domain/services/assistant/data-management-escalation-chain.service';
import {
  ESCALATION_ACKNOWLEDGE_OUTCOME_CHAIN_ALREADY_RESOLVED,
  ESCALATION_CHAIN_STATUS_EXHAUSTED,
  ESCALATION_PURPOSE_PROACTIVE_APPROVAL,
  IEscalationAcknowledgeResult,
  IEscalationChainSummary,
  IEscalationStageSummary,
  IUnresolvedEscalationChain,
  ESCALATION_CHAIN_STATUS_CANCELLED,
} from 'src/app/domain/interfaces/escalation-chain.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { CompanyDateTimePipe } from 'src/app/shared/pipes/company-date-time/company-date-time.pipe';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { calendarDateKey, companyCalendarDayOf } from 'src/app/shared/helpers/calendar-date.helper';
import {
  EscalationUrgency,
  currentStage,
  nextStage,
  remainingMs,
  remainingPercent,
  splitDuration,
  urgency,
} from './escalation-chain-display.helper';

interface CancelFormModel {
  reason: string;
}

const HTTP_STATUS_CONFLICT = 409;
const HTTP_STATUS_FORBIDDEN = 403;
const CANCEL_FORBIDDEN_TOAST_NAME = 'escalation-cancel-forbidden';
const ACKNOWLEDGE_ERROR_CODE = 'ESCALATION_ACKNOWLEDGE_ERROR';
const CANCEL_ERROR_CODE = 'ESCALATION_CANCEL_ERROR';
const ACKNOWLEDGE_TOO_LATE_KEY = 'escalation.intervention.acknowledge-too-late';
const ACKNOWLEDGE_ALREADY_HANDLED_KEY = 'escalation.intervention.acknowledge-already-handled';
const ACKNOWLEDGE_CONFLICT_TOAST_NAME = 'escalation-acknowledge-conflict';
const CLOCK_TICK_MS = 30000;
const SCHEDULE_ROUTE = '/workplace/schedule';
const SCENARIO_QUERY_PARAM = 'scenarioId';
const GROUP_QUERY_PARAM = 'groupId';
const DATE_QUERY_PARAM = 'date';
const FINDING_KIND_KEY_PREFIX = 'setting.proactiveGovernance.kind.';
const FINDING_UNKNOWN_KEY = 'escalation.intervention.finding-unknown';
const DURATION_DAYS_KEY = 'escalation.intervention.duration-days';
const DURATION_HOURS_KEY = 'escalation.intervention.duration-hours';
const DURATION_MINUTES_KEY = 'escalation.intervention.duration-minutes';

@Component({
  selector: 'app-escalation-intervention-list',
  templateUrl: './escalation-intervention-list.component.html',
  styleUrls: ['./escalation-intervention-list.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, FormField, CompanyDateTimePipe, ExpandableCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscalationInterventionListComponent implements OnInit, OnDestroy {
  readonly cancelReasonTemplate = viewChild.required<TemplateRef<unknown>>('cancelReasonModal');

  public escalationChainService = inject(DataManagementEscalationChainService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private ngbModal = inject(NgbModal);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private router = inject(Router);
  private ngUnsubscribe = new Subject<void>();

  private pendingCancelChainId: string | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  readonly nowMs = signal(Date.now());
  readonly chains = computed(() => this.escalationChainService.runningChains());
  readonly activeChains = computed(() => this.chains().filter((chain) => !chain.wakeNotBeforeUtc));
  readonly registeredChains = computed(() => this.chains().filter((chain) => !!chain.wakeNotBeforeUtc));
  readonly unresolvedChains = computed(() => this.escalationChainService.unresolvedChains());

  readonly cancelFormModel = signal<CancelFormModel>({ reason: '' });
  cancelForm = form(this.cancelFormModel);

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.layoutService.setContainerToNormalSize();
    this.escalationChainService.refresh();
    this.escalationChainService.refreshUnresolved();
    this.clockTimer = setInterval(() => this.nowMs.set(Date.now()), CLOCK_TICK_MS);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  findingLabel(chain: { findingKind: string | null }): string {
    if (!chain.findingKind) {
      return this.translateService.instant(FINDING_UNKNOWN_KEY);
    }

    const key = FINDING_KIND_KEY_PREFIX + chain.findingKind;
    const label = this.translateService.instant(key);
    return label === key ? this.translateService.instant(FINDING_UNKNOWN_KEY) : label;
  }

  remainingText(chain: IEscalationChainSummary): string {
    const duration = splitDuration(remainingMs(chain, this.nowMs()));
    if (duration.days > 0) {
      return this.translateService.instant(DURATION_DAYS_KEY, duration);
    }

    if (duration.hours > 0) {
      return this.translateService.instant(DURATION_HOURS_KEY, duration);
    }

    return this.translateService.instant(DURATION_MINUTES_KEY, duration);
  }

  isTimeOver(chain: IEscalationChainSummary): boolean {
    return remainingMs(chain, this.nowMs()) === 0;
  }

  progressPercent(chain: IEscalationChainSummary): number | null {
    return remainingPercent(chain, this.nowMs());
  }

  urgencyOf(chain: IEscalationChainSummary): EscalationUrgency {
    return urgency(chain, this.nowMs());
  }

  currentStageOf(chain: IEscalationChainSummary): IEscalationStageSummary | null {
    return currentStage(chain);
  }

  nextStageOf(chain: IEscalationChainSummary): IEscalationStageSummary | null {
    return nextStage(chain);
  }

  canOpenScenario(chain: IEscalationChainSummary): boolean {
    return !this.isProactiveApproval(chain) && !!chain.scenarioId;
  }

  isCancelled(chain: IUnresolvedEscalationChain): boolean {
    return chain.status === ESCALATION_CHAIN_STATUS_CANCELLED;
  }

  onOpenScenario(chain: Pick<IEscalationChainSummary, 'scenarioId' | 'groupId' | 'shiftStartUtc'>): void {
    if (!chain.scenarioId) {
      return;
    }

    const queryParams: Record<string, string> = { [SCENARIO_QUERY_PARAM]: chain.scenarioId };
    if (chain.groupId) {
      queryParams[GROUP_QUERY_PARAM] = chain.groupId;
    }
    if (chain.shiftStartUtc) {
      queryParams[DATE_QUERY_PARAM] = calendarDateKey(companyCalendarDayOf(chain.shiftStartUtc));
    }

    void this.router.navigate([SCHEDULE_ROUTE], { queryParams });
  }

  isProactiveApproval(chain: { purpose: string }): boolean {
    return chain.purpose === ESCALATION_PURPOSE_PROACTIVE_APPROVAL;
  }

  onAcknowledge(chain: IEscalationChainSummary): void {
    this.escalationChainService
      .acknowledge(chain.id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        error: (error: unknown) => this.onAcknowledgeError(error),
      });
  }

  private onAcknowledgeError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.status !== HTTP_STATUS_CONFLICT) {
      this.emitError(ACKNOWLEDGE_ERROR_CODE);
      return;
    }

    const result = error.error as IEscalationAcknowledgeResult | null;

    this.toastShowService.showError(
      this.translateService.instant(this.conflictToastKey(result)),
      ACKNOWLEDGE_CONFLICT_TOAST_NAME,
    );
    this.escalationChainService.refresh();
  }

  private conflictToastKey(result: IEscalationAcknowledgeResult | null): string {
    const deadlineLapsed =
      result?.outcome === ESCALATION_ACKNOWLEDGE_OUTCOME_CHAIN_ALREADY_RESOLVED &&
      result?.chainStatus === ESCALATION_CHAIN_STATUS_EXHAUSTED;

    return deadlineLapsed ? ACKNOWLEDGE_TOO_LATE_KEY : ACKNOWLEDGE_ALREADY_HANDLED_KEY;
  }

  onCancelClick(chain: IEscalationChainSummary): void {
    this.pendingCancelChainId = chain.id;
    this.cancelFormModel.set({ reason: '' });

    this.ngbModal.open(this.cancelReasonTemplate(), { size: 'md', centered: true }).result.then(
      () => this.confirmCancel(),
      () => {
        this.pendingCancelChainId = null;
      },
    );
  }

  private confirmCancel(): void {
    const chainId = this.pendingCancelChainId;
    const reason = this.cancelFormModel().reason.trim();
    this.pendingCancelChainId = null;

    if (!chainId || !reason) {
      return;
    }

    this.escalationChainService
      .cancel(chainId, reason)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        error: (error: unknown) => this.onCancelError(error),
      });
  }

  private onCancelError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === HTTP_STATUS_FORBIDDEN) {
      this.toastShowService.showError(
        this.translateService.instant(ACKNOWLEDGE_ALREADY_HANDLED_KEY),
        CANCEL_FORBIDDEN_TOAST_NAME,
      );
      this.escalationChainService.refresh();
      return;
    }

    this.emitError(CANCEL_ERROR_CODE);
  }

  isCancelReasonValid(): boolean {
    return this.cancelFormModel().reason.trim().length > 0;
  }

  private emitError(code: string): void {
    this.eventBus.emit(DomainEventType.ERROR, {
      message: '',
      code,
      context: 'EscalationInterventionListComponent',
    });
  }
}
