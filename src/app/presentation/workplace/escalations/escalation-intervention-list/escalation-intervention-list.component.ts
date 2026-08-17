// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin page for the escalation intervention list: every currently Running escalation chain, who
 * was woken, who acknowledged, and the two actions that resolve a chain - "übernehmen" (only shown
 * when the viewer currently holds the Notified stage on that specific chain) and "abbrechen" (Owner
 * decision B7: mandatory reason, admins may cancel any of this list's chains).
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
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { DataManagementEscalationChainService } from 'src/app/domain/services/assistant/data-management-escalation-chain.service';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

interface CancelFormModel {
  reason: string;
}

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

  onAcknowledge(chain: IEscalationChainSummary): void {
    this.escalationChainService
      .acknowledge(chain.id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        error: () => this.emitError('ESCALATION_ACKNOWLEDGE_ERROR'),
      });
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
        error: () => this.emitError('ESCALATION_CANCEL_ERROR'),
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
