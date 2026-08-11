// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ScheduleHomeComponent } from './schedule-home.component';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { SchedulePdfExportService } from '../schedule-section/services/schedule-pdf-export.service';
import { TimelinePdfExportService } from '../schedule-section/services/timeline-pdf-export.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';

describe('ScheduleHomeComponent', () => {
  const clientId = '131e24fe-2acf-4bd5-b70c-5af888321338';

  let component: ScheduleHomeComponent;
  let workFilter: { searchString: string; selectedGroup: string | undefined };
  let mockDataClientService: any;
  let mockGroupSelectionService: any;
  let mockSearchStateService: any;
  let queryParamMap$: BehaviorSubject<any>;
  let activatedRoute: any;

  function navigateTo(queryParams: Record<string, string>): void {
    activatedRoute.snapshot.queryParamMap = convertToParamMap(queryParams);
    queryParamMap$.next(activatedRoute.snapshot.queryParamMap);
  }

  function setup(queryParams: Record<string, string>): void {
    workFilter = { searchString: '', selectedGroup: 'a-group-outside-the-drift-client' };
    mockDataClientService = { getClient: vi.fn() };
    mockGroupSelectionService = { clearSelection: vi.fn(), selectedGroup: undefined };
    mockSearchStateService = { setRestoreSearch: vi.fn() };

    queryParamMap$ = new BehaviorSubject<any>(convertToParamMap(queryParams));
    activatedRoute = {
      snapshot: { queryParamMap: convertToParamMap(queryParams) },
      queryParamMap: queryParamMap$.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        ScheduleHomeComponent,
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: DataClientService, useValue: mockDataClientService },
        { provide: GroupSelectionService, useValue: mockGroupSelectionService },
        { provide: SearchStateService, useValue: mockSearchStateService },
        { provide: DataManagementScheduleService, useValue: { workFilter, readDatas: vi.fn() } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn(), detectChanges: vi.fn() } },
        { provide: SavebarService, useValue: {} },
        { provide: LayoutService, useValue: {} },
        { provide: SearchService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
        { provide: HolidayCollectionService, useValue: {} },
        { provide: DataCalendarSelectionService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: AllScheduleStateService, useValue: {} },
        { provide: SignalRService, useValue: {} },
        { provide: SchedulePdfExportService, useValue: {} },
        { provide: TimelinePdfExportService, useValue: {} },
        { provide: ScheduleViewModeService, useValue: {} },
        { provide: DataGroupService, useValue: {} },
      ],
    });

    component = TestBed.inject(ScheduleHomeComponent);
  }

  async function applyClientQueryParam(): Promise<void> {
    await (component as unknown as { applyClientQueryParam(): Promise<void> }).applyClientQueryParam();
  }

  describe('applyClientQueryParam', () => {
    it('should scope the schedule to the id number of the client in the query param', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockDataClientService.getClient).toHaveBeenCalledWith(clientId);
      expect(workFilter.searchString).toBe('1148');
      expect(mockSearchStateService.setRestoreSearch).toHaveBeenCalledWith('1148');
    });

    it('should drop the group selection so a client outside it still surfaces', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockGroupSelectionService.clearSelection).toHaveBeenCalled();
      expect(workFilter.selectedGroup).toBeUndefined();
    });

    it('should leave the filter untouched without a clientId query param', async () => {
      // Arrange
      setup({ groupId: 'some-group' });

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockDataClientService.getClient).not.toHaveBeenCalled();
      expect(workFilter.searchString).toBe('');
      expect(mockSearchStateService.setRestoreSearch).not.toHaveBeenCalled();
    });

    it('should fall back to the unfiltered schedule when the client cannot be read', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(throwError(() => new Error('403')));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(workFilter.searchString).toBe('');
      expect(mockSearchStateService.setRestoreSearch).not.toHaveBeenCalled();
    });
  });

  describe('a second one-click action while the page stays open', () => {
    async function setupReaction(): Promise<void> {
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));
      await applyClientQueryParam();
      (component as unknown as { setupActionQueryParamReaction(): void }).setupActionQueryParamReaction();
    }

    it('scopes the schedule to the client of the next message', async () => {
      // Arrange
      await setupReaction();
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 4711, name: 'Koch', firstName: 'Isabella' }));

      // Act
      navigateTo({ clientId: 'second-client-id' });
      await Promise.resolve();
      await Promise.resolve();

      // Assert
      expect(mockDataClientService.getClient).toHaveBeenLastCalledWith('second-client-id');
      expect(workFilter.searchString).toBe('4711');
      expect(mockSearchStateService.setRestoreSearch).toHaveBeenLastCalledWith('4711');
    });

    it('leaves the filter alone when the next navigation carries no action params', async () => {
      // Arrange
      await setupReaction();
      mockDataClientService.getClient.mockClear();

      // Act
      navigateTo({});
      await Promise.resolve();

      // Assert
      expect(mockDataClientService.getClient).not.toHaveBeenCalled();
      expect(workFilter.searchString).toBe('1148');
    });
  });
});
