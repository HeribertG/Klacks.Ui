// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal as angularSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CollisionDetectionService } from './collision-detection.service';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { IScheduleValidationNotification } from 'src/app/domain/interfaces/schedule-validation-notification.interface';
import { IScheduleValidationListNotification } from 'src/app/domain/interfaces/schedule-validation-list-notification.interface';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

function createCollision(overrides: Partial<ICollisionNotification> = {}): ICollisionNotification {
  return {
    workId1: 'work-1',
    workId2: 'work-2',
    clientId: 'client-1',
    clientName: 'Test Client',
    date: '2026-03-15',
    timeRange1: '08:00-12:00',
    timeRange2: '10:00-14:00',
    blockType1: 'Work',
    blockType2: 'Work',
    ...overrides,
  };
}

function createValidation(overrides: Partial<IScheduleValidationNotification> = {}): IScheduleValidationNotification {
  return {
    type: 'warning',
    clientId: 'client-1',
    clientName: 'Test Client',
    date: '2026-03-15',
    comment: 'schedule.error-list.rest-violation',
    commentParams: { hours: '8' },
    ...overrides,
  };
}

function flushAndTick(): void {
  TestBed.flushEffects();
  vi.advanceTimersByTime(100);
}

describe('CollisionDetectionService', () => {
  let service: CollisionDetectionService;
  let collisionsDetected$: Subject<ICollisionListNotification>;
  let scheduleValidationsDetected$: Subject<IScheduleValidationListNotification>;
  let chunkLoadedSignal: ReturnType<typeof angularSignal<number>>;
  let isWorkScheduleReadSignal: ReturnType<typeof angularSignal<number>>;
  let isShiftScheduleReadSignal: ReturnType<typeof angularSignal<{ count: number; resetScroll: boolean }>>;
  let dataManagementMock: {
    clients: { id: string }[];
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    workFilter: { selectedGroup?: string };
    workScheduleChunkLoaded: ReturnType<typeof angularSignal<number>>;
    isWorkScheduleRead: ReturnType<typeof angularSignal<number>>;
    isShiftScheduleRead: ReturnType<typeof angularSignal<{ count: number; resetScroll: boolean }>>;
    shiftSchedules: { date: Date; abbreviation: string; sumEmployees: number; quantity: number; engaged: number }[];
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Arrange
    collisionsDetected$ = new Subject<ICollisionListNotification>();
    scheduleValidationsDetected$ = new Subject<IScheduleValidationListNotification>();
    chunkLoadedSignal = angularSignal(0);

    isWorkScheduleReadSignal = angularSignal(0);
    isShiftScheduleReadSignal = angularSignal({ count: 0, resetScroll: true });
    dataManagementMock = {
      clients: [{ id: 'client-1' }, { id: 'client-2' }],
      visibleStartDate: new Date('2026-03-01'),
      visibleEndDate: new Date('2026-03-31'),
      workFilter: { selectedGroup: undefined },
      workScheduleChunkLoaded: chunkLoadedSignal,
      isWorkScheduleRead: isWorkScheduleReadSignal,
      isShiftScheduleRead: isShiftScheduleReadSignal,
      shiftSchedules: [],
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        CollisionDetectionService,
        {
          provide: SCHEDULE_SIGNALR,
          useValue: {
            collisionsDetected$: collisionsDetected$.asObservable(),
            scheduleValidationsDetected$: scheduleValidationsDetected$.asObservable(),
            // AnalyseScenarioService listens here for background-optimiser candidates on construction.
            wizard4CandidatesChanged$: new Subject<never>(),
          },
        },
        { provide: DataManagementScheduleService, useValue: dataManagementMock },
      ],
    });

    service = TestBed.inject(CollisionDetectionService);
  });

  afterEach(() => {
    vi.useRealTimers();
    collisionsDetected$.complete();
    scheduleValidationsDetected$.complete();
  });

  describe('Collision Notifications', () => {
    it('should replace all collisions when isFullRefresh is true', () => {
      // Arrange
      const initial: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-1' }),
        ],
      };
      collisionsDetected$.next(initial);
      flushAndTick();
      expect(service.errorCount()).toBe(2);

      // Act
      const refresh: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ workId1: 'w5', workId2: 'w6', clientId: 'client-1' })],
      };
      collisionsDetected$.next(refresh);
      flushAndTick();

      // Assert
      expect(service.errorCount()).toBe(1);
    });

    it('should remove old entries for checkedClientId/checkedDate and add new ones when isFullRefresh is false', () => {
      // Arrange
      const initial: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1', date: '2026-03-15' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-1', date: '2026-03-16' }),
        ],
      };
      collisionsDetected$.next(initial);
      flushAndTick();
      expect(service.errorCount()).toBe(2);

      // Act
      const update: ICollisionListNotification = {
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-15',
        collisions: [createCollision({ workId1: 'w5', workId2: 'w6', clientId: 'client-1', date: '2026-03-15' })],
      };
      collisionsDetected$.next(update);
      flushAndTick();

      // Assert
      expect(service.errorCount()).toBe(2);
      const dates = service.errorEntries().map(e => e.date);
      expect(dates).toContain('2026-03-15');
      expect(dates).toContain('2026-03-16');
    });

    it('should create errorEntries with type error for collisions', () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({
          clientId: 'client-1',
          clientName: 'Max Mustermann',
          date: '2026-03-20',
          timeRange1: '08:00-12:00',
          timeRange2: '10:00-14:00',
        })],
      };

      // Act
      collisionsDetected$.next(notification);
      flushAndTick();

      // Assert
      const entry = service.errorEntries()[0];
      expect(entry.type).toBe('error');
      expect(entry.date).toBe('2026-03-20');
      expect(entry.clientName).toBe('Max Mustermann');
      expect(entry.comment).toBe('schedule.error-list.collision');
      expect(entry.commentParams).toMatchObject({
        timeRange1: '08:00-12:00',
        timeRange2: '10:00-14:00',
      });
    });
  });

  describe('Validation Notifications', () => {
    it('should replace all validations when isFullRefresh is true', () => {
      // Arrange
      const initial: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ clientId: 'client-1', date: '2026-03-10', comment: 'rest-violation-1' }),
          createValidation({ clientId: 'client-1', date: '2026-03-11', comment: 'rest-violation-2' }),
        ],
      };
      scheduleValidationsDetected$.next(initial);
      flushAndTick();
      expect(service.errorEntries().length).toBe(2);

      // Act
      const refresh: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [createValidation({ clientId: 'client-1', date: '2026-03-12', comment: 'rest-violation-3' })],
      };
      scheduleValidationsDetected$.next(refresh);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
      expect(service.errorEntries()[0].date).toBe('2026-03-12');
    });

    it('should remove old entries for checkedClientId/checkedDate and add new ones when isFullRefresh is false', () => {
      // Arrange
      const initial: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ clientId: 'client-1', date: '2026-03-15', comment: 'old-warning' }),
          createValidation({ clientId: 'client-1', date: '2026-03-16', comment: 'keep-warning' }),
        ],
      };
      scheduleValidationsDetected$.next(initial);
      flushAndTick();
      expect(service.errorEntries().length).toBe(2);

      // Act
      const update: IScheduleValidationListNotification = {
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-15',
        entries: [createValidation({ clientId: 'client-1', date: '2026-03-15', comment: 'new-warning' })],
      };
      scheduleValidationsDetected$.next(update);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(2);
      const comments = service.errorEntries().map(e => e.comment);
      expect(comments).toContain('new-warning');
      expect(comments).toContain('keep-warning');
      expect(comments).not.toContain('old-warning');
    });

    it('should map rest-violation entries as type warning', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [createValidation({
          type: 'warning',
          clientId: 'client-1',
          comment: 'schedule.error-list.rest-violation',
          commentParams: { hours: '11' },
        })],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      const entry = service.errorEntries()[0];
      expect(entry.type).toBe('warning');
      expect(entry.comment).toBe('schedule.error-list.rest-violation');
      expect(entry.commentParams).toEqual({ hours: '11' });
    });

    it('should retract a week-scoped entry when another day of the same week is re-checked', () => {
      // Arrange: weekly violation anchored on Monday 2026-03-09
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [createValidation({
          clientId: 'client-1',
          date: '2026-03-09',
          comment: 'schedule.error-list.weekly-overtime',
        })],
      });
      flushAndTick();
      expect(service.errorEntries().length).toBe(1);

      // Act: Wednesday of the same week is re-checked and no longer reports the violation
      scheduleValidationsDetected$.next({
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-11',
        entries: [],
      });
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should retract a week-scoped entry when the re-checked day is a Sunday', () => {
      // Arrange: Sunday 2026-03-15 still belongs to the week starting Monday 2026-03-09
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [createValidation({
          clientId: 'client-1',
          date: '2026-03-09',
          comment: 'schedule.error-list.min-rest-days',
        })],
      });
      flushAndTick();

      // Act
      scheduleValidationsDetected$.next({
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-15',
        entries: [],
      });
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should retract a consecutive-days entry anchored on another day of the same week', () => {
      // Arrange: run starting Tuesday 2026-03-10, reported on its start day
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [createValidation({
          clientId: 'client-1',
          date: '2026-03-10',
          comment: 'schedule.error-list.consecutive-days',
        })],
      });
      flushAndTick();

      // Act: a different day of the same ISO week is re-checked
      scheduleValidationsDetected$.next({
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-13',
        entries: [],
      });
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should keep a week-scoped entry belonging to a different week', () => {
      // Arrange: violation of the previous week, anchored on Monday 2026-03-02
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [createValidation({
          clientId: 'client-1',
          date: '2026-03-02',
          comment: 'schedule.error-list.weekly-overtime',
        })],
      });
      flushAndTick();

      // Act: a day of the following week is re-checked
      scheduleValidationsDetected$.next({
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-11',
        entries: [],
      });
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
      expect(service.errorEntries()[0].date).toBe('2026-03-02');
    });

    it('should map info entries as type info', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [createValidation({
          type: 'info',
          clientId: 'client-1',
          comment: 'schedule.error-list.understaffed',
          commentParams: { needed: '3', actual: '1' },
        })],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      const entry = service.errorEntries()[0];
      expect(entry.type).toBe('info');
      expect(entry.comment).toBe('schedule.error-list.understaffed');
      expect(entry.commentParams).toEqual({ needed: '3', actual: '1' });
    });
  });

  describe('Filter and Visibility', () => {
    it('should only include entries for visible clients', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ clientId: 'client-1' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'unknown-client' }),
        ],
      };

      // Act
      collisionsDetected$.next(collisionNotification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
      expect(service.errorEntries()[0].clientName).toBe('Test Client');
    });

    it('should only include entries within visible date range', () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ clientId: 'client-1', date: '2026-03-15' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-1', date: '2026-05-01' }),
          createCollision({ workId1: 'w5', workId2: 'w6', clientId: 'client-1', date: '2026-01-01' }),
        ],
      };

      // Act
      collisionsDetected$.next(notification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
      expect(service.errorEntries()[0].date).toBe('2026-03-15');
    });

    it('should combine errors, warnings and infos in errorEntries', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      const validationNotification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-16', comment: 'warning-entry' }),
          createValidation({ type: 'info', clientId: 'client-2', date: '2026-03-17', comment: 'info-entry' }),
        ],
      };

      // Act
      collisionsDetected$.next(collisionNotification);
      scheduleValidationsDetected$.next(validationNotification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(3);
      const types = service.errorEntries().map(e => e.type);
      expect(types).toContain('error');
      expect(types).toContain('warning');
      expect(types).toContain('info');
    });
  });

  describe('Team-scoped planning-rule entries', () => {
    const emptyGuid = '00000000-0000-0000-0000-000000000000';

    it('should list a planning-rule finding without client as team entry and drop other client-less entries', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({
            type: 'warning',
            clientId: emptyGuid,
            clientName: '',
            comment: 'schedule.error-list.planning-rule',
            commentParams: { kind: 'TeamFairness', observed: '3', limit: '1', ruleId: 'rule-1' },
          }),
          createValidation({ clientId: emptyGuid, comment: 'schedule.error-list.understaffed' }),
        ],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      const entries = service.errorEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].clientName).toBe('schedule.error-list.team-entry');
      expect(entries[0].commentParams?.['kind']).toBe('planning-rule-kind.teamfairness');
      expect(entries[0].tooltip).toBe('rule-1');
    });

    it('should list an invalid planning rule as team entry with the rule id only as tooltip', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({
            type: 'error',
            clientId: emptyGuid,
            clientName: '',
            comment: 'schedule.error-list.planning-rule-invalid',
            commentParams: { ruleId: 'rule-9' },
          }),
        ],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      const entry = service.errorEntries()[0];
      expect(entry.type).toBe('error');
      expect(entry.tooltip).toBe('rule-9');
    });
  });

  describe('Edge Cases', () => {
    it('should deduplicate collisions by sorted work ID pair', () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1' }),
          createCollision({ workId1: 'w2', workId2: 'w1', clientId: 'client-1' }),
        ],
      };

      // Act
      collisionsDetected$.next(notification);
      flushAndTick();

      // Assert
      expect(service.errorCount()).toBe(1);
    });

    it('should use type_clientId_date_comment as unique validation key', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-15', comment: 'rest-violation' }),
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-15', comment: 'rest-violation' }),
        ],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
    });

    it('should allow same comment on different dates as separate entries', () => {
      // Arrange
      const notification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-15', comment: 'rest-violation' }),
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-16', comment: 'rest-violation' }),
        ],
      };

      // Act
      scheduleValidationsDetected$.next(notification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(2);
    });

    it('should update errorEntries when new clients become visible via chunk load', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-3' })],
      };
      const validationNotification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [createValidation({ clientId: 'client-3' })],
      };
      collisionsDetected$.next(collisionNotification);
      scheduleValidationsDetected$.next(validationNotification);
      flushAndTick();
      expect(service.errorEntries().length).toBe(0);

      // Act
      dataManagementMock.clients.push({ id: 'client-3' });
      chunkLoadedSignal.update(v => v + 1);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(2);
    });
  });

  describe('Clear on reload', () => {
    it('should clear all entries when date range changes on reload', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      const validationNotification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [createValidation({ clientId: 'client-1', date: '2026-03-16', comment: 'warning-1' })],
      };
      collisionsDetected$.next(collisionNotification);
      scheduleValidationsDetected$.next(validationNotification);
      flushAndTick();
      expect(service.errorEntries().length).toBe(2);

      // Act
      dataManagementMock.visibleStartDate = new Date('2026-04-01');
      dataManagementMock.visibleEndDate = new Date('2026-04-30');
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should clear all entries when group changes on reload', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      collisionsDetected$.next(collisionNotification);
      flushAndTick();
      expect(service.errorEntries().length).toBe(1);

      // Act
      dataManagementMock.workFilter.selectedGroup = 'group-123';
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should keep cached entries when same group and date range reload', () => {
      // Arrange
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();

      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      collisionsDetected$.next(collisionNotification);
      flushAndTick();
      expect(service.errorEntries().length).toBe(1);

      // Act
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(1);
    });

    it('should show new entries after reload with changed dates', () => {
      // Arrange
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();

      const initialNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      collisionsDetected$.next(initialNotification);
      flushAndTick();
      expect(service.errorEntries().length).toBe(1);

      // Act
      dataManagementMock.visibleStartDate = new Date('2026-04-01');
      dataManagementMock.visibleEndDate = new Date('2026-04-30');
      isWorkScheduleReadSignal.update(v => v + 1);
      flushAndTick();
      expect(service.errorEntries().length).toBe(0);

      const newNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w10', workId2: 'w11', clientId: 'client-2', date: '2026-04-15' }),
          createCollision({ workId1: 'w12', workId2: 'w13', clientId: 'client-2', date: '2026-04-16' }),
        ],
      };
      collisionsDetected$.next(newNotification);
      flushAndTick();

      // Assert
      expect(service.errorEntries().length).toBe(2);
      expect(service.errorEntries().every(e => e.clientId === 'client-2')).toBe(true);
    });
  });

  describe('errorCount', () => {
    it('should return 0 when no entries exist', () => {
      // Arrange / Act / Assert
      expect(service.errorCount()).toBe(0);
    });

    it('should reflect count per type', () => {
      // Arrange
      const collisionNotification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };
      const validationNotification: IScheduleValidationListNotification = {
        isFullRefresh: true,
        entries: [
          createValidation({ type: 'warning', clientId: 'client-1', date: '2026-03-16', comment: 'warning-1' }),
          createValidation({ type: 'info', clientId: 'client-2', date: '2026-03-17', comment: 'info-1' }),
        ],
      };

      // Act
      collisionsDetected$.next(collisionNotification);
      scheduleValidationsDetected$.next(validationNotification);
      flushAndTick();

      // Assert
      expect(service.errorCount()).toBe(1);
      expect(service.warningCount()).toBe(1);
      expect(service.infoCount()).toBe(1);
      expect(service.errorEntries().length).toBe(3);
    });
  });

  describe('rest-violation retraction across browser time zones', () => {
    const REST_KEY = 'schedule.error-list.rest-violation';

    function seed(entries: IScheduleValidationNotification[]): void {
      scheduleValidationsDetected$.next({ isFullRefresh: true, entries });
      flushAndTick();
    }

    function recheck(
      clientId: string,
      checkedDate: string,
      entries: IScheduleValidationNotification[] = [],
    ): void {
      scheduleValidationsDetected$.next({
        isFullRefresh: false,
        checkedClientId: clientId,
        checkedDate,
        entries,
      });
      flushAndTick();
    }

    function dates(): string[] {
      return service.errorEntries().map((e) => e.date).sort();
    }

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('retracts a rest violation dated the day before the re-checked day', () => {
          seed([createValidation({ clientId: 'client-1', date: '2026-03-10', comment: REST_KEY })]);
          expect(dates()).toEqual(['2026-03-10']);

          recheck('client-1', '2026-03-11');

          expect(dates()).toEqual([]);
        });

        it('keeps a rest violation dated the day after the re-checked day', () => {
          seed([createValidation({ clientId: 'client-1', date: '2026-03-12', comment: REST_KEY })]);

          recheck('client-1', '2026-03-11');

          expect(dates()).toEqual(['2026-03-12']);
        });

        it('keeps a rest violation of another client dated the day before', () => {
          seed([createValidation({ clientId: 'client-2', date: '2026-03-10', comment: REST_KEY })]);

          recheck('client-1', '2026-03-11');

          expect(dates()).toEqual(['2026-03-10']);
        });

        it('keeps a non rest-violation entry dated the day before', () => {
          seed([createValidation({ clientId: 'client-1', date: '2026-03-10', comment: 'schedule.error-list.understaffed' })]);

          recheck('client-1', '2026-03-11');

          expect(dates()).toEqual(['2026-03-10']);
        });

        it('replaces entries dated the re-checked day with the pushed entries', () => {
          seed([createValidation({
            clientId: 'client-1',
            date: '2026-03-11',
            comment: REST_KEY,
            commentParams: { hours: '8' },
          })]);

          recheck('client-1', '2026-03-11', [createValidation({
            clientId: 'client-1',
            date: '2026-03-11',
            comment: REST_KEY,
            commentParams: { hours: '9' },
          })]);

          expect(service.errorEntries().length).toBe(1);
          expect(service.errorEntries()[0].commentParams).toEqual({ hours: '9' });
        });

        it.each([
          ['month boundary', '2026-03-01', '2026-02-28'],
          ['year boundary', '2026-01-01', '2025-12-31'],
          ['spring DST change (Europe)', '2026-03-30', '2026-03-29'],
          ['spring DST change (US)', '2026-03-09', '2026-03-08'],
          ['autumn DST change (Europe)', '2026-10-26', '2026-10-25'],
        ])('retracts the previous-day rest violation across a %s', (_label, checkedDate, previousDate) => {
          seed([createValidation({ clientId: 'client-1', date: previousDate, comment: REST_KEY })]);

          recheck('client-1', checkedDate);

          expect(dates()).toEqual([]);
        });
      });
    }
  });

  describe('understaffed shift dates across browser time zones', () => {
    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('activates the configured zone', () => {
          expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
        });

        it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
          'reports an understaffed shift dated %s on 2026-08-03',
          (wireDate) => {
            dataManagementMock.visibleStartDate = parseCalendarDate('2026-08-01');
            dataManagementMock.visibleEndDate = parseCalendarDate('2026-08-31');
            dataManagementMock.shiftSchedules = [
              { date: wireDate as unknown as Date, abbreviation: 'F', sumEmployees: 2, quantity: 1, engaged: 1 },
            ];

            collisionsDetected$.next({ isFullRefresh: true, collisions: [] });
            flushAndTick();

            const infoDates = service.errorEntries().filter((e) => e.type === 'info').map((e) => e.date);
            expect(infoDates).toEqual(['2026-08-03']);
          },
        );
      });
    }
  });
  describe('holiday-work entry in the reader language across browser time zones', () => {
    const HOLIDAY_WORK_KEY = 'schedule.error-list.holiday-work';
    const ST_JOSEPH = JSON.stringify({
      de: 'Josefstag',
      en: "St. Joseph's Day",
      fr: 'Saint-Joseph',
      it: 'San Giuseppe',
      ja: '聖ヨセフの日',
      'zh-cn': '圣约瑟节',
    });

    function pushHolidayWork(): void {
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [
          createValidation({
            date: '2026-03-19',
            comment: HOLIDAY_WORK_KEY,
            commentParams: { holiday: 'Josefstag', holidayI18n: ST_JOSEPH },
          }),
        ],
      });
      flushAndTick();
    }

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it.each([
          ['ja', '聖ヨセフの日'],
          ['zh-CN', '圣约瑟节'],
          ['de', 'Josefstag'],
        ])('names the holiday in %s and keeps the calendar day', (language, expected) => {
          TestBed.inject(TranslateService).use(language);

          pushHolidayWork();

          const entry = service.errorEntries().find((e) => e.comment === HOLIDAY_WORK_KEY);
          expect(entry?.commentParams).toEqual({ holiday: expected });
          expect(entry?.date).toBe('2026-03-19');
        });
      });
    }
  });

  describe('date parameters in the reader locale across browser time zones', () => {
    const EXPIRING_SOON_KEY = 'schedule.error-list.qualification-expiring-soon';
    const COMPENSATORY_REST_KEY = 'schedule.error-list.compensatory-rest-due';

    function pushFindings(): void {
      scheduleValidationsDetected$.next({
        isFullRefresh: true,
        entries: [
          createValidation({
            date: '2026-03-02',
            comment: EXPIRING_SOON_KEY,
            commentParams: { qualificationId: 'q-1', validUntil: '2026-12-31' },
          }),
          createValidation({
            date: '2026-03-01',
            comment: COMPENSATORY_REST_KEY,
            commentParams: { shortfallHours: '2.5', triggerDate: '2026-03-01', dueDate: '2026-03-15' },
          }),
        ],
      });
      flushAndTick();
    }

    beforeEach(async () => {
      await TestBed.inject(LocaleDataLoaderService).ensureLoaded('de');
    });

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('shows the dates in the locale format, not as ISO strings', () => {
          TestBed.inject(LocaleService).setLocale('de');

          pushFindings();

          const entries = service.errorEntries();
          expect(entries.find((e) => e.comment === EXPIRING_SOON_KEY)?.commentParams).toEqual({
            qualificationId: 'q-1',
            validUntil: '31.12.2026',
          });
          expect(entries.find((e) => e.comment === COMPENSATORY_REST_KEY)?.commentParams).toEqual({
            shortfallHours: '2.5',
            triggerDate: '01.03.2026',
            dueDate: '15.03.2026',
          });
        });
      });
    }
  });
});
