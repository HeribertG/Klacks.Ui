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
    it('shows absent hours on a day with a true hour as blocked, like an explicit block', async () => {
      await load([row(8, true), row(9, false)]);

      expect(service.getGroupDisplayState(CLIENT, DAY, 10, 12)).toBe(AvailabilityDisplayState.Blocked);
      expect(service.getGroupDisplayState(CLIENT, DAY, 9, 11)).toBe(AvailabilityDisplayState.Blocked);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 9)).toBe(AvailabilityDisplayState.Available);
    });

    it('shows absent hours on a day with only false hours as empty', async () => {
      await load([row(8, false)]);

      expect(service.getGroupDisplayState(CLIENT, DAY, 10, 12)).toBe(AvailabilityDisplayState.Empty);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 9)).toBe(AvailabilityDisplayState.Blocked);
      expect(service.getGroupDisplayState(CLIENT, DAY, 8, 10)).toBe(AvailabilityDisplayState.Mixed);
    });

    it('lists the display state of every hour of a mixed group under the day rule', async () => {
      await load([row(7, true)]);

      expect(service.getGroupDisplayState(CLIENT, DAY, 6, 8)).toBe(AvailabilityDisplayState.Mixed);
      expect(service.getGroupHourDisplayStates(CLIENT, DAY, 6, 8)).toEqual([
        { hour: 6, state: AvailabilityDisplayState.Blocked },
        { hour: 7, state: AvailabilityDisplayState.Available },
      ]);
    });
  });

  describe('click cycle', () => {
    const CLICKS = 4;

    const displaysAfterClicks = (startHour: number, endHour: number): AvailabilityDisplayState[] => {
      const displays = [service.getGroupDisplayState(CLIENT, DAY, startHour, endHour)];
      for (let click = 0; click < CLICKS; click++) {
        service.toggleAvailability(CLIENT, DAY, startHour, endHour);
        displays.push(service.getGroupDisplayState(CLIENT, DAY, startHour, endHour));
      }
      return displays;
    };

    it('cycles a 2h group on a day without a check empty -> available -> blocked -> empty', async () => {
      await load([]);

      expect(displaysAfterClicks(10, 12)).toEqual([
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
      ]);
      expect(service.getStoredHour(CLIENT, DAY, 10)).toBe(true);
    });

    it('cycles a 1h cell on a day without a check empty -> available -> blocked -> empty', async () => {
      await load([]);

      expect(displaysAfterClicks(10, 11)).toEqual([
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
        AvailabilityDisplayState.Blocked,
        AvailabilityDisplayState.Empty,
        AvailabilityDisplayState.Available,
      ]);
    });

    for (const [name, startHour, endHour] of [['1h cell', 10, 11], ['2h group', 10, 12]] as const) {
      it(`switches a ${name} between blocked and available on a day with another check, clearing back to the day rule`, async () => {
        await load([row(6, true)]);

        expect(displaysAfterClicks(startHour, endHour)).toEqual([
          AvailabilityDisplayState.Blocked,
          AvailabilityDisplayState.Available,
          AvailabilityDisplayState.Blocked,
          AvailabilityDisplayState.Available,
          AvailabilityDisplayState.Blocked,
        ]);
        expect(service.getStoredHour(CLIENT, DAY, startHour)).toBeUndefined();
      });

      it(`turns an explicitly blocked ${name} on a day with another check into available`, async () => {
        await load([row(6, true), row(10, false), row(11, false)]);

        service.toggleAvailability(CLIENT, DAY, startHour, endHour);

        expect(service.getGroupDisplayState(CLIENT, DAY, startHour, endHour)).toBe(AvailabilityDisplayState.Available);
      });

      it(`stores false when the ${name} holds the last check of the day, so it turns blocked instead of empty`, async () => {
        await load([]);
        service.toggleAvailability(CLIENT, DAY, startHour, endHour);

        service.toggleAvailability(CLIENT, DAY, startHour, endHour);

        expect(service.getStoredHour(CLIENT, DAY, startHour)).toBe(false);
        expect(service.getGroupDisplayState(CLIENT, DAY, startHour, endHour)).toBe(AvailabilityDisplayState.Blocked);
      });
    }

    it('sets a mixed group to true', async () => {
      await load([row(10, false)]);

      service.toggleAvailability(CLIENT, DAY, 10, 12);

      expect(service.getStoredHour(CLIENT, DAY, 10)).toBe(true);
      expect(service.getStoredHour(CLIENT, DAY, 11)).toBe(true);
    });

    it('turns a mixed group (check + day-rule block) into available', async () => {
      await load([row(7, true)]);

      expect(displaysAfterClicks(6, 8).slice(0, 2)).toEqual([
        AvailabilityDisplayState.Mixed,
        AvailabilityDisplayState.Available,
      ]);
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
