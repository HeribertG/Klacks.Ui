// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  AVAILABILITY_AUTO_SAVE_DEBOUNCE_MS,
  DataManagementClientAvailabilityService,
} from './data-management-client-availability.service';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { IClientAvailability } from 'src/app/domain/models/client-availability/client-availability.interface';
import { IClientAvailabilityBulkRequest } from 'src/app/domain/models/client-availability/client-availability-bulk-request.interface';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { EMPTY_GUID } from 'src/app/domain/constants/empty-guid.constants';

const CLIENT = 'c1';
const DAY = '2026-11-05';

function row(hour: number, isAvailable: boolean, id = `id-${hour}`): IClientAvailability {
  return { id, clientId: CLIENT, date: DAY, hour, isAvailable };
}

describe('DataManagementClientAvailabilityService', () => {
  let service: DataManagementClientAvailabilityService;
  let dataService: { getAvailabilities: ReturnType<typeof vi.fn>; bulkUpdate: ReturnType<typeof vi.fn> };

  const load = async (items: IClientAvailability[]): Promise<void> => {
    dataService.getAvailabilities.mockReturnValue(of(items));
    await service.readDataAsync(DAY, DAY);
  };

  const flushSave = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(AVAILABILITY_AUTO_SAVE_DEBOUNCE_MS);
  };

  const lastRequest = (): IClientAvailabilityBulkRequest =>
    dataService.bulkUpdate.mock.calls[dataService.bulkUpdate.mock.calls.length - 1][0];

  beforeEach(() => {
    vi.useFakeTimers();
    dataService = {
      getAvailabilities: vi.fn().mockReturnValue(of([])),
      bulkUpdate: vi.fn().mockReturnValue(of(1)),
    };
    TestBed.configureTestingModule({
      providers: [
        DataManagementClientAvailabilityService,
        { provide: DataClientAvailabilityService, useValue: dataService },
      ],
    });
    service = TestBed.inject(DataManagementClientAvailabilityService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('stored states', () => {
    it('keeps an absent hour absent instead of turning it into false', async () => {
      await load([row(8, false)]);

      expect(service.getStoredHour(CLIENT, DAY, 8)).toBe(false);
      expect(service.getStoredHour(CLIENT, DAY, 9)).toBeUndefined();
    });

    it('counts only true hours as available', async () => {
      await load([row(8, true), row(9, false)]);

      expect(service.isHourAvailable(CLIENT, DAY, 8)).toBe(true);
      expect(service.isHourAvailable(CLIENT, DAY, 9)).toBe(false);
      expect(service.isHourAvailable(CLIENT, DAY, 10)).toBe(false);
    });

    it('marks the day as having an available hour while at least one true hour exists', async () => {
      await load([row(8, true)]);
      expect(service.dayHasAvailableHour(CLIENT, DAY)).toBe(true);

      service.setHourRange(CLIENT, DAY, 8, 9, false);
      expect(service.dayHasAvailableHour(CLIENT, DAY)).toBe(false);
    });
  });

  describe('display state', () => {
    it('shows absent hours on a day with a true hour as derived blocked', async () => {
      await load([row(8, true)]);

      expect(service.getGroupDisplayState(CLIENT, DAY, 10, 12)).toBe(AvailabilityDisplayState.DerivedBlocked);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 9)).toBe(AvailabilityDisplayState.Available);
    });

    it('shows absent hours on a day with only false hours as empty', async () => {
      await load([row(8, false)]);

      expect(service.getGroupDisplayState(CLIENT, DAY, 10, 12)).toBe(AvailabilityDisplayState.Empty);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 9)).toBe(AvailabilityDisplayState.Blocked);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 10)).toBe(AvailabilityDisplayState.Mixed);
    });
  });

  describe('click cycle', () => {
    it('cycles a 2h group empty -> available -> blocked -> empty', async () => {
      await load([]);

      const displays = [service.getGroupDisplayState(CLIENT, DAY, 10, 12)];
      for (let click = 0; click < 3; click++) {
        service.toggleAvailability(CLIENT, DAY, 10, 12);
        displays.push(service.getGroupDisplayState(CLIENT, DAY, 10, 12));
      }

      expect(displays).toEqual([
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Empty,
      ]);
      expect(service.getStoredHour(CLIENT, DAY, 10)).toBeUndefined();
      expect(service.getStoredHour(CLIENT, DAY, 11)).toBeUndefined();
    });

    it('changes the display on every click on a day with another check', async () => {
      await load([row(6, true)]);

      const displays = [service.getGroupDisplayState(CLIENT, DAY, 10, 12)];
      for (let click = 0; click < 3; click++) {
        service.toggleAvailability(CLIENT, DAY, 10, 12);
        displays.push(service.getGroupDisplayState(CLIENT, DAY, 10, 12));
      }

      expect(displays).toEqual([
        AvailabilityDisplayState.DerivedBlocked,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.DerivedBlocked,
      ]);
    });

    it('sets a mixed group to true', async () => {
      await load([row(10, false)]);

      service.toggleAvailability(CLIENT, DAY, 10, 12);

      expect(service.getStoredHour(CLIENT, DAY, 10)).toBe(true);
      expect(service.getStoredHour(CLIENT, DAY, 11)).toBe(true);
    });
  });

  describe('persist', () => {
    it('sends a hour that became absent with isAvailable null and its loaded id', async () => {
      await load([row(10, false, 'row-10')]);

      service.setHourRange(CLIENT, DAY, 10, 11, null);
      await flushSave();

      expect(lastRequest().items).toEqual([
        { id: 'row-10', clientId: CLIENT, date: DAY, hour: 10, isAvailable: null },
      ]);
    });

    it('sends true and false values and an empty id for new rows', async () => {
      await load([]);

      service.setHourRange(CLIENT, DAY, 10, 11, true);
      service.setHourRange(CLIENT, DAY, 11, 12, false);
      await flushSave();

      expect(lastRequest().items).toEqual([
        { id: EMPTY_GUID, clientId: CLIENT, date: DAY, hour: 10, isAvailable: true },
        { id: EMPTY_GUID, clientId: CLIENT, date: DAY, hour: 11, isAvailable: false },
      ]);
    });

    it('forgets the id of a removed row after a successful save', async () => {
      await load([row(10, true, 'row-10')]);

      service.setHourRange(CLIENT, DAY, 10, 11, null);
      await flushSave();
      service.setHourRange(CLIENT, DAY, 10, 11, true);
      await flushSave();

      expect(lastRequest().items).toEqual([
        { id: EMPTY_GUID, clientId: CLIENT, date: DAY, hour: 10, isAvailable: true },
      ]);
    });

    it('does not send hours whose value did not change', async () => {
      await load([row(10, true)]);

      service.setHourRange(CLIENT, DAY, 10, 11, true);
      await flushSave();

      expect(dataService.bulkUpdate).not.toHaveBeenCalled();
    });
  });
});
