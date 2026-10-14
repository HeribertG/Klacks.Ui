// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { AutofillRunPresenceService } from './autofill-run-presence.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IAutofillRunPresence } from 'src/app/domain/interfaces/autofill-run-presence.interface';
import { DataAutofillRunService } from 'src/app/infrastructure/api/auto-wizard/data-autofill-run.service';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const GROUP_A = 'group-a';
const GROUP_B = 'group-b';

function runOf(overrides: Partial<IAutofillRunPresence> = {}): IAutofillRunPresence {
  return {
    runId: 'run-1',
    groupId: GROUP_A,
    periodFrom: '2026-06-01',
    periodUntil: '2026-06-30',
    progressPercent: null,
    ...overrides,
  };
}

describe('AutofillRunPresenceService', () => {
  const selectedGroupId = signal<string | undefined>(undefined);
  const isRead = signal({ count: 0, resetScroll: false });
  const isWorkScheduleRead = signal(0);

  let schedule: {
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    isRead: typeof isRead;
    isWorkScheduleRead: typeof isWorkScheduleRead;
  };
  let started$: Subject<IAutofillRunPresence>;
  let ended$: Subject<IAutofillRunPresence>;
  let connected$: Subject<void>;
  let answers: Subject<IAutofillRunPresence[]>[];
  let getActive: Mock;
  let service: AutofillRunPresenceService;

  function answer(index: number, runs: IAutofillRunPresence[]): void {
    answers[index].next(runs);
    answers[index].complete();
  }

  function answerLatest(runs: IAutofillRunPresence[]): void {
    answer(answers.length - 1, runs);
  }

  function runIds(): string[] {
    return [...service.runs().keys()].sort();
  }

  function showView(groupId: string | undefined, from: Date, until: Date): void {
    selectedGroupId.set(groupId);
    schedule.periodStartDate = from;
    schedule.periodEndDate = until;
    isRead.update((v) => ({ ...v, count: v.count + 1 }));
  }

  beforeEach(() => {
    selectedGroupId.set(undefined);
    schedule = { periodStartDate: null, periodEndDate: null, isRead, isWorkScheduleRead };
    started$ = new Subject<IAutofillRunPresence>();
    ended$ = new Subject<IAutofillRunPresence>();
    connected$ = new Subject<void>();
    answers = [];
    getActive = vi.fn(() => {
      const pending = new Subject<IAutofillRunPresence[]>();
      answers.push(pending);
      return pending;
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DataAutofillRunService, useValue: { getActive } },
        {
          provide: SCHEDULE_SIGNALR,
          useValue: { autofillRunStarted$: started$, autofillRunEnded$: ended$, connected$ },
        },
        {
          provide: GroupSelectionService,
          useValue: {
            get selectedGroupId() {
              return selectedGroupId();
            },
          },
        },
        { provide: DataManagementScheduleService, useValue: schedule },
      ],
    });
    service = TestBed.inject(AutofillRunPresenceService);
    TestBed.tick();
    answerLatest([]);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('asking the server', () => {
    it('asks once when the service starts', () => {
      // Assert
      expect(getActive).toHaveBeenCalledTimes(1);
    });

    it('asks again after every full schedule load', () => {
      // Act
      isWorkScheduleRead.update((v) => v + 1);
      TestBed.tick();

      // Assert
      expect(getActive).toHaveBeenCalledTimes(2);
    });

    it('does not ask again when the schedule only re-renders', () => {
      // Act
      isRead.update((v) => ({ ...v, count: v.count + 1 }));
      TestBed.tick();

      // Assert
      expect(getActive).toHaveBeenCalledTimes(1);
    });

    it('asks again after the SignalR connection was established again', () => {
      // Act
      connected$.next();

      // Assert
      expect(getActive).toHaveBeenCalledTimes(2);
    });

    it('forgets a run the server no longer knows after a reconnect, as after an API restart', () => {
      // Arrange
      started$.next(runOf());

      // Act
      connected$.next();
      answerLatest([]);

      // Assert
      expect(runIds()).toEqual([]);
    });
  });

  describe('pushes', () => {
    it('adds a started run and removes it when it ends', () => {
      // Act
      started$.next(runOf());
      const whileRunning = runIds();
      ended$.next(runOf());

      // Assert
      expect(whileRunning).toEqual(['run-1']);
      expect(runIds()).toEqual([]);
    });

    it('keeps a run announced twice once', () => {
      // Act
      started$.next(runOf());
      started$.next(runOf());

      // Assert
      expect(runIds()).toEqual(['run-1']);
    });

    it('ignores the end of a run it never knew', () => {
      // Arrange
      started$.next(runOf({ runId: 'run-2' }));

      // Act
      ended$.next(runOf({ runId: 'run-1' }));

      // Assert
      expect(runIds()).toEqual(['run-2']);
    });
  });

  describe('refresh', () => {
    it('replaces the state with the server answer', () => {
      // Arrange
      started$.next(runOf({ runId: 'run-1' }));

      // Act
      service.refresh();
      answerLatest([runOf({ runId: 'run-2' })]);

      // Assert
      expect(runIds()).toEqual(['run-2']);
    });

    it('does not bring back a run that ended while the request was under way', () => {
      // Arrange
      started$.next(runOf());
      service.refresh();

      // Act
      ended$.next(runOf());
      answerLatest([runOf()]);

      // Assert
      expect(runIds()).toEqual([]);
    });

    it('does not bring back an ended run with a later answer either', () => {
      // Arrange
      started$.next(runOf());
      ended$.next(runOf());

      // Act
      service.refresh();
      answerLatest([runOf()]);

      // Assert
      expect(runIds()).toEqual([]);
    });

    it('keeps a run that started while the request was under way although the answer misses it', () => {
      // Arrange
      service.refresh();

      // Act
      started$.next(runOf({ runId: 'run-2' }));
      answerLatest([runOf({ runId: 'run-1' })]);

      // Assert
      expect(runIds()).toEqual(['run-1', 'run-2']);
    });

    it('drops a run started before a later request once that request answers without it', () => {
      // Arrange
      service.refresh();
      started$.next(runOf({ runId: 'run-2' }));

      // Act
      service.refresh();
      answerLatest([]);

      // Assert
      expect(runIds()).toEqual([]);
    });

    it('counts only the newest of two overlapping answers, whichever arrives first', () => {
      // Arrange
      service.refresh();
      const older = answers.length - 1;
      service.refresh();
      const newer = answers.length - 1;

      // Act
      answer(newer, [runOf({ runId: 'run-new' })]);
      answer(older, [runOf({ runId: 'run-old' })]);

      // Assert
      expect(runIds()).toEqual(['run-new']);
    });

    it('ignores an older answer that arrives before the newer one', () => {
      // Arrange
      service.refresh();
      const older = answers.length - 1;
      service.refresh();
      const newer = answers.length - 1;

      // Act
      answer(older, [runOf({ runId: 'run-old' })]);
      const afterOlder = runIds();
      answer(newer, [runOf({ runId: 'run-new' })]);

      // Assert
      expect(afterOlder).toEqual([]);
      expect(runIds()).toEqual(['run-new']);
    });

    it('leaves the state as it is when the request fails and still refreshes afterwards', () => {
      // Arrange
      started$.next(runOf());

      // Act
      service.refresh();
      answers[answers.length - 1].error(new Error('offline'));
      const afterFailure = runIds();
      service.refresh();
      answerLatest([]);

      // Assert
      expect(afterFailure).toEqual(['run-1']);
      expect(runIds()).toEqual([]);
    });
  });

  describe('isRunningForCurrentView across browser time zones', () => {
    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('activates the configured zone', () => {
          expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
        });

        it('is true for a run of the shown group whose period matches the shown period', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 5, 1), new Date(2026, 5, 30));

          // Act
          started$.next(runOf());

          // Assert
          expect(service.isRunningForCurrentView()).toBe(true);
        });

        it('is false for a run of another group', () => {
          // Arrange
          showView(GROUP_B, new Date(2026, 5, 1), new Date(2026, 5, 30));

          // Act
          started$.next(runOf());

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('is false when the periods do not overlap', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 6, 1), new Date(2026, 6, 31));

          // Act
          started$.next(runOf());

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('is true when the periods overlap partly', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 5, 22), new Date(2026, 6, 5));

          // Act
          started$.next(runOf());

          // Assert
          expect(service.isRunningForCurrentView()).toBe(true);
        });

        it('counts a shared first or last day as overlap', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 5, 30), new Date(2026, 6, 6));
          started$.next(runOf());
          const sharedLastDay = service.isRunningForCurrentView();

          // Act
          showView(GROUP_A, new Date(2026, 4, 25), new Date(2026, 5, 1));

          // Assert
          expect(sharedLastDay).toBe(true);
          expect(service.isRunningForCurrentView()).toBe(true);
        });

        it('is false for a run that ended the day before the shown period starts', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 6, 1), new Date(2026, 6, 7));

          // Act
          started$.next(runOf({ periodFrom: '2026-06-24', periodUntil: '2026-06-30' }));

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('shows a run without a group only on all groups', () => {
          // Arrange
          started$.next(runOf({ groupId: null }));
          showView(undefined, new Date(2026, 5, 1), new Date(2026, 5, 30));
          const onAllGroups = service.isRunningForCurrentView();

          // Act
          showView(GROUP_A, new Date(2026, 5, 1), new Date(2026, 5, 30));

          // Assert
          expect(onAllGroups).toBe(true);
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('does not show a run of a group on all groups', () => {
          // Arrange
          showView(undefined, new Date(2026, 5, 1), new Date(2026, 5, 30));

          // Act
          started$.next(runOf({ groupId: GROUP_A }));

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('goes off when the run ends', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 5, 1), new Date(2026, 5, 30));
          started$.next(runOf());
          const whileRunning = service.isRunningForCurrentView();

          // Act
          ended$.next(runOf());

          // Assert
          expect(whileRunning).toBe(true);
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('is false for a run with an unreadable period', () => {
          // Arrange
          showView(GROUP_A, new Date(2026, 5, 1), new Date(2026, 5, 30));

          // Act
          started$.next(runOf({ periodFrom: '', periodUntil: '2026-06-30' }));

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });

        it('is false while no schedule period is shown', () => {
          // Act
          started$.next(runOf());

          // Assert
          expect(service.isRunningForCurrentView()).toBe(false);
        });
      });
    }
  });
});
