// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin page for the escalation intervention list: every currently Running escalation chain, who
 * was woken, who acknowledged, and the two actions that resolve a chain - "übernehmen" (only shown
 * when the viewer currently holds the Notified stage on that specific chain) and "abbrechen" (Owner
 * decision B7: mandatory reason, admins may cancel any of this list's chains). A take-over answered with
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
  viewChild,
  TemplateRef,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
} from 'src/app/domain/interfaces/escalation-chain.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

interface CancelFormModel {
  reason: string;
}

const HTTP_STATUS_CONFLICT = 409;
const ACKNOWLEDGE_ERROR_CODE = 'ESCALATION_ACKNOWLEDGE_ERROR';
const CANCEL_ERROR_CODE = 'ESCALATION_CANCEL_ERROR';
const ACKNOWLEDGE_TOO_LATE_KEY = 'escalation.intervention.acknowledge-too-late';
const ACKNOWLEDGE_ALREADY_HANDLED_KEY = 'escalation.intervention.acknowledge-already-handled';
const ACKNOWLEDGE_CONFLICT_TOAST_NAME = 'escalation-acknowledge-conflict';

@Component({
  selector: 'app-escalation-intervention-list',
  templateUrl: './escalation-intervention-list.component.html',
  styleUrls: ['./escalation-intervention-list.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, FormField],
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
  private ngUnsubscribe = new Subject<void>();

  private pendingCancelChainId: string | null = null;

  readonly cancelFormModel = signal<CancelFormModel>({ reason: '' });
  cancelForm = form(this.cancelFormModel);

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.layoutService.setContainerToNormalSize();
    this.escalationChainService.refresh();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  minutesUntil(deadlineUtc: string): number {
    const diffMs = new Date(deadlineUtc).getTime() - Date.now();
    return Math.round(diffMs / 60000);
  }

  isProactiveApproval(chain: IEscalationChainSummary): boolean {
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
        error: () => this.emitError(CANCEL_ERROR_CODE),
      });
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
