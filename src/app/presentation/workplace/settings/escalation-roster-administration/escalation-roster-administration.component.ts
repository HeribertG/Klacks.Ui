// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin view of the escalation roster: one flat list of every user with any group visibility and a
 * phone number, drag'n'drop for their wake-up order, and each member's absence periods. Deliberately
 * NOT group-scoped - which group(s) a member is actually called for is decided by their own
 * GroupVisibility rows at escalation time, not by anything picked on this page.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataEscalationRosterService } from 'src/app/infrastructure/api/assistant/data-escalation-roster.service';
import { DataUserAbsencePeriodService } from 'src/app/infrastructure/api/settings/data-user-absence-period.service';
import { IEscalationRosterMember, IUserAbsencePeriod } from 'src/app/domain/interfaces/escalation-roster.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

const PERMANENT_ABSENCE_END_DATE = '9999-12-31';

@Component({
  selector: 'app-escalation-roster-administration',
  templateUrl: './escalation-roster-administration.component.html',
  styleUrls: ['./escalation-roster-administration.component.scss'],
  standalone: true,
  imports: [FormsModule, CdkDropList, CdkDrag, TranslateModule, SpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscalationRosterAdministrationComponent implements OnInit, OnDestroy {
  private rosterService = inject(DataEscalationRosterService);
  private absencePeriodService = inject(DataUserAbsencePeriodService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private ngUnsubscribe = new Subject<void>();

  readonly members = signal<IEscalationRosterMember[]>([]);
  readonly isLoadingRoster = signal<boolean>(false);

  readonly expandedUserId = signal<string>('');
  readonly absencePeriods = signal<IUserAbsencePeriod[]>([]);
  readonly isLoadingAbsences = signal<boolean>(false);
  readonly isSavingAbsence = signal<boolean>(false);

  readonly newAbsenceStart = signal<string>('');
  readonly newAbsenceEnd = signal<string>('');
  readonly newAbsenceReason = signal<string>('');

  ngOnInit(): void {
    this.loadRoster();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onDrop(event: CdkDragDrop<IEscalationRosterMember[]>): void {
    const previousOrder = this.members();
    const reordered = [...previousOrder];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.members.set(reordered);

    this.rosterService
      .reorderRoster(reordered.map((member) => member.userId))
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        error: () => {
          this.members.set(previousOrder);
          this.emitError('ESCALATION_ROSTER_REORDER_ERROR');
        },
      });
  }

  toggleAbsenceEditor(userId: string): void {
    if (this.expandedUserId() === userId) {
      this.collapseAbsenceEditor();
      return;
    }

    this.expandedUserId.set(userId);
    this.newAbsenceStart.set('');
    this.newAbsenceEnd.set('');
    this.newAbsenceReason.set('');
    this.loadAbsencePeriods(userId);
  }

  fillPermanentEndDate(): void {
    this.newAbsenceEnd.set(PERMANENT_ABSENCE_END_DATE);
  }

  addAbsencePeriod(): void {
    const userId = this.expandedUserId();
    const start = this.newAbsenceStart();
    const end = this.newAbsenceEnd();
    if (!userId || !start || !end) {
      return;
    }

    this.isSavingAbsence.set(true);
    this.absencePeriodService
      .create(userId, start, end, this.newAbsenceReason().trim() || null)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isSavingAbsence.set(false)),
      )
      .subscribe({
        next: () => {
          this.newAbsenceStart.set('');
          this.newAbsenceEnd.set('');
          this.newAbsenceReason.set('');
          this.loadAbsencePeriods(userId);
          this.loadRoster();
        },
        error: () => this.emitError('ESCALATION_ROSTER_ABSENCE_SAVE_ERROR'),
      });
  }

  deleteAbsencePeriod(id: string): void {
    const userId = this.expandedUserId();

    this.absencePeriodService
      .delete(id)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: () => {
          this.loadAbsencePeriods(userId);
          this.loadRoster();
        },
        error: () => this.emitError('ESCALATION_ROSTER_ABSENCE_DELETE_ERROR'),
      });
  }

  private collapseAbsenceEditor(): void {
    this.expandedUserId.set('');
    this.absencePeriods.set([]);
  }

  private loadRoster(): void {
    this.isLoadingRoster.set(true);

    this.rosterService
      .getRoster()
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isLoadingRoster.set(false)),
      )
      .subscribe({
        next: (result) => this.members.set(result),
        error: () => this.emitError('ESCALATION_ROSTER_LOAD_ERROR'),
      });
  }

  private loadAbsencePeriods(userId: string): void {
    this.isLoadingAbsences.set(true);

    this.absencePeriodService
      .getByUser(userId)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isLoadingAbsences.set(false)),
      )
      .subscribe({
        next: (result) => this.absencePeriods.set(result),
        error: () => this.emitError('ESCALATION_ROSTER_LOAD_ABSENCE_ERROR'),
      });
  }

  private emitError(code: string): void {
    this.eventBus.emit(DomainEventType.ERROR, {
      message: '',
      code,
      context: 'EscalationRosterAdministrationComponent',
    });
  }
}
