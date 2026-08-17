// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin view of a root group's escalation call list: pick a root, see who is currently visible and
 * reachable, and manage each member's absence periods. Wake-up order itself comes from
 * AppUser.DisplayOrder (maintained in the user administration list, not here).
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
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataGroupVisibilityService } from 'src/app/infrastructure/api/group/data-group-visibility.service';
import { DataEscalationRosterService } from 'src/app/infrastructure/api/assistant/data-escalation-roster.service';
import { DataUserAbsencePeriodService } from 'src/app/infrastructure/api/settings/data-user-absence-period.service';
import { IGroup } from 'src/app/domain/models/group/group-class';
import { IEscalationRosterMember, IUserAbsencePeriod } from 'src/app/domain/interfaces/escalation-roster.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

const PERMANENT_ABSENCE_END_DATE = '9999-12-31';

@Component({
  selector: 'app-escalation-roster-administration',
  templateUrl: './escalation-roster-administration.component.html',
  styleUrls: ['./escalation-roster-administration.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, SpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscalationRosterAdministrationComponent implements OnInit, OnDestroy {
  private groupVisibilityService = inject(DataGroupVisibilityService);
  private rosterService = inject(DataEscalationRosterService);
  private absencePeriodService = inject(DataUserAbsencePeriodService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private ngUnsubscribe = new Subject<void>();

  readonly roots = signal<IGroup[]>([]);
  readonly selectedGroupId = signal<string>('');
  readonly members = signal<IEscalationRosterMember[]>([]);
  readonly isLoadingRoots = signal<boolean>(false);
  readonly isLoadingRoster = signal<boolean>(false);

  readonly expandedUserId = signal<string>('');
  readonly absencePeriods = signal<IUserAbsencePeriod[]>([]);
  readonly isLoadingAbsences = signal<boolean>(false);
  readonly isSavingAbsence = signal<boolean>(false);

  readonly newAbsenceStart = signal<string>('');
  readonly newAbsenceEnd = signal<string>('');
  readonly newAbsenceReason = signal<string>('');

  ngOnInit(): void {
    this.loadRoots();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onGroupChange(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.collapseAbsenceEditor();
    if (groupId) {
      this.loadRoster(groupId);
    } else {
      this.members.set([]);
    }
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
          if (this.selectedGroupId()) {
            this.loadRoster(this.selectedGroupId());
          }
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
          if (this.selectedGroupId()) {
            this.loadRoster(this.selectedGroupId());
          }
        },
        error: () => this.emitError('ESCALATION_ROSTER_ABSENCE_DELETE_ERROR'),
      });
  }

  private collapseAbsenceEditor(): void {
    this.expandedUserId.set('');
    this.absencePeriods.set([]);
  }

  private loadRoots(): void {
    this.isLoadingRoots.set(true);

    this.groupVisibilityService
      .getRoots()
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isLoadingRoots.set(false)),
      )
      .subscribe({
        next: (result) => this.roots.set(result),
        error: () => this.emitError('ESCALATION_ROSTER_LOAD_ROOTS_ERROR'),
      });
  }

  private loadRoster(groupId: string): void {
    this.isLoadingRoster.set(true);

    this.rosterService
      .getRoster(groupId)
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
