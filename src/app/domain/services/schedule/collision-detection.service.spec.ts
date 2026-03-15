// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Subject, signal } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollisionDetectionService } from './collision-detection.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import {
  ICollisionListNotification,
  ICollisionNotification,
} from 'src/app/domain/interfaces/collision-notification.interface';
import { signal as angularSignal } from '@angular/core';

function createCollision(overrides: Partial<ICollisionNotification> = {}): ICollisionNotification {
  return {
    workId1: 'work-1',
    workId2: 'work-2',
    clientId: 'client-1',
    clientName: 'Test Client',
    date: '2026-03-15',
    timeRange1: '08:00-12:00',
    timeRange2: '10:00-14:00',
    ...overrides,
  };
}

describe('CollisionDetectionService', () => {
  let service: CollisionDetectionService;
  let collisionsDetected$: Subject<ICollisionListNotification>;
  let chunkLoadedSignal: ReturnType<typeof angularSignal<boolean>>;
  let dataManagementMock: {
    clients: { id: string }[];
    visibleStartDate: Date | null;
    visibleEndDate: Date | null;
    workScheduleChunkLoaded: ReturnType<typeof angularSignal<boolean>>;
  };

  beforeEach(() => {
    // Arrange
    collisionsDetected$ = new Subject<ICollisionListNotification>();
    chunkLoadedSignal = angularSignal(false);

    dataManagementMock = {
      clients: [{ id: 'client-1' }, { id: 'client-2' }],
      visibleStartDate: new Date('2026-03-01'),
      visibleEndDate: new Date('2026-03-31'),
      workScheduleChunkLoaded: chunkLoadedSignal,
    };

    TestBed.configureTestingModule({
      providers: [
        CollisionDetectionService,
        { provide: SCHEDULE_SIGNALR, useValue: { collisionsDetected$: collisionsDetected$.asObservable() } },
        { provide: DataManagementScheduleService, useValue: dataManagementMock },
      ],
    });

    service = TestBed.inject(CollisionDetectionService);
  });

  afterEach(() => {
    collisionsDetected$.complete();
  });

  describe('errorEntries', () => {
    it('should populate errorEntries when collision notification arrives for visible client', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1' })],
      };

      // Act
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorEntries().length).toBe(1);
      expect(service.errorEntries()[0].clientName).toBe('Test Client');
      expect(service.errorEntries()[0].type).toBe('error');
    });

    it('should filter out collisions for non-visible clients', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'unknown-client' })],
      };

      // Act
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should filter out collisions outside visible date range', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1', date: '2026-05-01' })],
      };

      // Act
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorEntries().length).toBe(0);
    });

    it('should include collisions within visible date range', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-1', date: '2026-03-15' })],
      };

      // Act
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorEntries().length).toBe(1);
    });

    it('should update errorEntries when new clients become visible via chunk load', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ clientId: 'client-3' })],
      };
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(service.errorEntries().length).toBe(0);

      // Act
      dataManagementMock.clients.push({ id: 'client-3' });
      chunkLoadedSignal.set(true);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorEntries().length).toBe(1);
    });
  });

  describe('errorCount', () => {
    it('should return 0 when no collisions exist', () => {
      // Arrange / Act / Assert
      expect(service.errorCount()).toBe(0);
    });

    it('should match errorEntries length', async () => {
      // Arrange
      const notification: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-2' }),
        ],
      };

      // Act
      collisionsDetected$.next(notification);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorCount()).toBe(2);
      expect(service.errorCount()).toBe(service.errorEntries().length);
    });
  });

  describe('processNotification', () => {
    it('should clear old collisions on fullRefresh', async () => {
      // Arrange
      const initial: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-1' }),
        ],
      };
      collisionsDetected$.next(initial);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(service.errorCount()).toBe(2);

      // Act
      const refresh: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ workId1: 'w5', workId2: 'w6', clientId: 'client-1' })],
      };
      collisionsDetected$.next(refresh);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorCount()).toBe(1);
    });

    it('should add collisions incrementally when not fullRefresh', async () => {
      // Arrange
      const first: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1' })],
      };
      collisionsDetected$.next(first);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const second: ICollisionListNotification = {
        isFullRefresh: false,
        collisions: [createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-2' })],
      };
      collisionsDetected$.next(second);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorCount()).toBe(2);
    });

    it('should remove collisions for checkedClientId and checkedDate before adding new ones', async () => {
      // Arrange
      const initial: ICollisionListNotification = {
        isFullRefresh: true,
        collisions: [
          createCollision({ workId1: 'w1', workId2: 'w2', clientId: 'client-1', date: '2026-03-15' }),
          createCollision({ workId1: 'w3', workId2: 'w4', clientId: 'client-1', date: '2026-03-16' }),
        ],
      };
      collisionsDetected$.next(initial);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(service.errorCount()).toBe(2);

      // Act
      const update: ICollisionListNotification = {
        isFullRefresh: false,
        checkedClientId: 'client-1',
        checkedDate: '2026-03-15',
        collisions: [],
      };
      collisionsDetected$.next(update);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorCount()).toBe(1);
      expect(service.errorEntries()[0].date).toBe('2026-03-16');
    });

    it('should deduplicate collisions by sorted work ID pair', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(service.errorCount()).toBe(1);
    });
  });

  describe('errorEntries content', () => {
    it('should map collision fields to ScheduleErrorEntry correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const entry = service.errorEntries()[0];
      expect(entry.type).toBe('error');
      expect(entry.date).toBe('2026-03-20');
      expect(entry.clientName).toBe('Max Mustermann');
      expect(entry.comment).toBe('schedule.error-list.collision');
      expect(entry.commentParams).toEqual({
        timeRange1: '08:00-12:00',
        timeRange2: '10:00-14:00',
      });
    });
  });
});
