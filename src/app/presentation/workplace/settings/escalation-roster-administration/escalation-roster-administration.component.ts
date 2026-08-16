// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin view of a group's escalation call list: pick a group, see the derived/overridden order,
 * and move active planners up or down (persisted as EscalationRosterEntry.OverrideRank).
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { IconAngleUpComponent } from 'src/app/presentation/icons/icon-angle-up.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataEscalationRosterService } from 'src/app/infrastructure/api/assistant/data-escalation-roster.service';
import { GroupFilter, IGroup } from 'src/app/domain/models/group/group-class';
import { IEscalationRosterEntry } from 'src/app/domain/interfaces/escalation-roster.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

const GROUP_LIST_PAGE_SIZE = 1000;

@Component({
  selector: 'app-escalation-roster-administration',
  templateUrl: './escalation-roster-administration.component.html',
  styleUrls: ['./escalation-roster-administration.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, SpinnerModule, IconAngleUpComponent, IconAngleDownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscalationRosterAdministrationComponent implements OnInit, OnDestroy {
  private dataGroupService = inject(DataGroupService);
  private rosterService = inject(DataEscalationRosterService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private ngUnsubscribe = new Subject<void>();

  readonly groups = signal<IGroup[]>([]);
  readonly selectedGroupId = signal<string>('');
  readonly entries = signal<IEscalationRosterEntry[]>([]);
  readonly isLoadingGroups = signal<boolean>(false);
  readonly isLoadingRoster = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly activeEntries = computed(() => this.entries().filter((e) => !e.isOrphaned));
  readonly orphanedEntries = computed(() => this.entries().filter((e) => e.isOrphaned));

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onGroupChange(groupId: string): void {
    this.selectedGroupId.set(groupId);
    if (groupId) {
      this.loadRoster(groupId);
    } else {
      this.entries.set([]);
    }
  }

  moveUp(index: number): void {
    this.swapActive(index, index - 1);
  }

  moveDown(index: number): void {
    this.swapActive(index, index + 1);
  }

  private swapActive(index: number, targetIndex: number): void {
    const active = [...this.activeEntries()];
    if (targetIndex < 0 || targetIndex >= active.length) {
      return;
    }

    [active[index], active[targetIndex]] = [active[targetIndex], active[index]];
    this.entries.set([...active, ...this.orphanedEntries()]);
    this.saveOrder(active.map((e) => e.userId));
  }

  private loadGroups(): void {
    this.isLoadingGroups.set(true);
    const filter = new GroupFilter();
    filter.numberOfItemsPerPage = GROUP_LIST_PAGE_SIZE;

    this.dataGroupService
      .readGroupList(filter)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isLoadingGroups.set(false)),
      )
      .subscribe({
        next: (result) => this.groups.set(result.groups),
        error: () => this.emitError('ESCALATION_ROSTER_LOAD_GROUPS_ERROR'),
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
        next: (result) => this.entries.set(result),
        error: () => this.emitError('ESCALATION_ROSTER_LOAD_ERROR'),
      });
  }

  private saveOrder(orderedUserIds: string[]): void {
    const groupId = this.selectedGroupId();
    if (!groupId) {
      return;
    }

    this.isSaving.set(true);
    this.rosterService
      .setOrder(groupId, orderedUserIds)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        error: () => this.emitError('ESCALATION_ROSTER_SAVE_ERROR'),
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
