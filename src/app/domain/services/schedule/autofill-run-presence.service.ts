// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Knows the autofill (AutoWizard) runs in progress on the server, so every viewer of a group sees the progress line
 * of a run and not only the planner who started it. The server is the truth: each refresh replaces the state with
 * its answer, and the started/ended pushes keep it current in between. A refresh follows every full schedule load
 * (schedule opened, group or period changed), every established SignalR connection and the planner's own start.
 * Only the newest answer counts, a run that ended while a request was under way never comes back, a run that
 * started meanwhile is not lost, and a failed request leaves the state as it is.
 * @param runs - Runs in progress by presence id
 * @param isRunningForCurrentView - True while a run plans exactly the shown group (null = all groups, matching a run
 *   without a group) and its period overlaps the shown schedule period
 */

import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, Subject, switchMap } from 'rxjs';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IAutofillRunPresence } from 'src/app/domain/interfaces/autofill-run-presence.interface';
import { DataAutofillRunService } from 'src/app/infrastructure/api/auto-wizard/data-autofill-run.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { calendarDateKey } from 'src/app/domain/helpers/calendar-date.helper';

@Injectable({ providedIn: 'root' })
export class AutofillRunPresenceService {
  private readonly dataAutofillRun = inject(DataAutofillRunService);
  private readonly signalR = inject(SCHEDULE_SIGNALR);
  private readonly groupSelection = inject(GroupSelectionService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _runs = signal<ReadonlyMap<string, IAutofillRunPresence>>(new Map());
  private readonly _endedRunIds = new Set<string>();
  private readonly _refreshRequests = new Subject<void>();
  private _startedDuringRequest = new Map<string, IAutofillRunPresence>();
  private _isRequestPending = false;

  readonly runs = this._runs.asReadonly();

  readonly isRunningForCurrentView = computed(() => {
    const runs = this._runs();
    this.dataManagementSchedule.isRead();
    const groupId = this.groupSelection.selectedGroupId ?? null;
    const viewFrom = calendarDateKey(this.dataManagementSchedule.periodStartDate);
    const viewUntil = calendarDateKey(this.dataManagementSchedule.periodEndDate);
    if (!viewFrom || !viewUntil) {
      return false;
    }
    return [...runs.values()].some(
      (run) => (run.groupId ?? null) === groupId && this.overlapsView(run, viewFrom, viewUntil),
    );
  });

  constructor() {
    this.signalR.autofillRunStarted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((run) => this.applyStarted(run));
    this.signalR.autofillRunEnded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((run) => this.applyEnded(run));
    this.signalR.connected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
    this._refreshRequests
      .pipe(
        switchMap(() => this.requestActiveRuns()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((runs) => this.applySnapshot(runs));

    effect(() => {
      this.dataManagementSchedule.isWorkScheduleRead();
      untracked(() => this.refresh());
    });
  }

  refresh(): void {
    this._refreshRequests.next();
  }

  private requestActiveRuns(): Observable<IAutofillRunPresence[] | null> {
    this._startedDuringRequest = new Map();
    this._isRequestPending = true;
    return this.dataAutofillRun.getActive().pipe(catchError(() => of(null)));
  }

  private applySnapshot(runs: IAutofillRunPresence[] | null): void {
    const startedMeanwhile = this._startedDuringRequest;
    this._startedDuringRequest = new Map();
    this._isRequestPending = false;
    if (runs === null) {
      return;
    }
    const next = new Map<string, IAutofillRunPresence>();
    for (const run of [...runs, ...startedMeanwhile.values()]) {
      if (!this._endedRunIds.has(run.runId)) {
        next.set(run.runId, run);
      }
    }
    this._runs.set(next);
  }

  private applyStarted(run: IAutofillRunPresence): void {
    if (this._endedRunIds.has(run.runId)) {
      return;
    }
    if (this._isRequestPending) {
      this._startedDuringRequest.set(run.runId, run);
    }
    this._runs.update((runs) => new Map(runs).set(run.runId, run));
  }

  private applyEnded(run: IAutofillRunPresence): void {
    this._endedRunIds.add(run.runId);
    this._startedDuringRequest.delete(run.runId);
    if (!this._runs().has(run.runId)) {
      return;
    }
    this._runs.update((runs) => {
      const next = new Map(runs);
      next.delete(run.runId);
      return next;
    });
  }

  private overlapsView(run: IAutofillRunPresence, viewFrom: string, viewUntil: string): boolean {
    const runFrom = calendarDateKey(run.periodFrom);
    const runUntil = calendarDateKey(run.periodUntil);
    return !!runFrom && !!runUntil && runFrom <= viewUntil && viewFrom <= runUntil;
  }
}
