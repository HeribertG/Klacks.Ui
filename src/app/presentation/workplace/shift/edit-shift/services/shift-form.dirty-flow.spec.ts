// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Runs the real shift form against the real shift service: date and time live in the form model and in another format
 * than the loaded shift, so only the whole round trip shows whether a change counts and whether loading or saving does not.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { calendarDateKey } from 'src/app/domain/helpers/calendar-date.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { ShiftFormModel } from 'src/app/presentation/view-models/shift-form.model';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { environment } from 'src/environments/environment';
import { ShiftFormService } from './shift-form.service';

const SHIFT_URL = `${environment.baseUrl}Shifts/`;
const KEY_TOKEN = 'key-token';
const SETTLE_MS = 1000;
const LOADED_UNTIL: NgbDateStruct = { year: 2026, month: 12, day: 14 };
const LOADED_FROM: NgbDateStruct = { year: 2026, month: 12, day: 1 };
const LOADED_SHIFT = {
  id: 'shift-1',
  clientId: 'client-1',
  name: 'Night care',
  abbreviation: 'NC',
  fromDate: '2026-12-01T00:00:00',
  untilDate: '2026-12-14T00:00:00',
  startShift: '07:00:00',
  endShift: '15:00:00',
  beforeShift: '00:00:00',
  afterShift: '00:00:00',
  travelTimeBefore: '00:00:00',
  travelTimeAfter: '00:00:00',
  briefingTime: '00:15:00',
  debriefingTime: null,
  workTime: 7.33,
  quantity: 1,
  sumEmployees: 1,
  isMonday: true,
  status: ShiftStatus.OriginalOrder,
  groups: [],
};

describe('shift form dirty flow', () => {
  let service: DataManagementShiftService;
  let http: HttpTestingController;

  const settle = (): void => {
    TestBed.tick();
    vi.advanceTimersByTime(SETTLE_MS);
    TestBed.tick();
  };

  const form = (): ShiftFormModel => TestBed.inject(ShiftFormService).shiftForm()!;

  const load = (shift: object = LOADED_SHIFT): void => {
    service.readShift('shift-1');
    http.expectOne(`${SHIFT_URL}shift-1`).flush(shift);
    settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        WorkTimeCalculationService,
        { provide: EVENT_BUS_TOKEN, useValue: { emit: () => undefined, on: () => of(), onAny: () => of() } },
        {
          provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN,
          useValue: { register: () => undefined, get: () => null, has: () => false, clear: () => undefined, getRegisteredRoutes: () => [] },
        },
        {
          provide: TranslateService,
          useValue: { instant: () => '', get: () => of(''), onTranslationChange: of(), onLangChange: of(), onDefaultLangChange: of() },
        },
        { provide: PERMISSION_CHECKER, useValue: { hasPermission: () => false, isAdmin: false } },
        {
          provide: DataManagementCalendarSelectionService,
          useValue: { isRead: () => false, readData: () => undefined, calendarsSelections: [], chips: [] },
        },
        {
          provide: SCHEDULE_SIGNALR,
          useValue: { wizard4CandidatesChanged$: new Subject(), autofillRunEnded$: new Subject() },
        },
      ],
    });
    service = TestBed.inject(DataManagementShiftService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(ShiftFormService);
    service.onBeforeSave = () => TestBed.inject(ShiftFormService).applyFormToShift();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe.each(CALENDAR_TEST_ZONES)('in %s', (zone) => {
    useTimeZone(zone);

    it('is clean after loading, however often it is asked', () => {
      load();

      expect(service.areObjectsDirty()).toBe(false);
      expect(service.areObjectsDirty()).toBe(false);
    });

    it('counts a changed until date and is clean again on the loaded value, like any other field', () => {
      load();

      form().internalUntilDate = { year: 2026, month: 12, day: 20 };
      expect(service.areObjectsDirty()).toBe(true);

      form().internalUntilDate = { ...LOADED_UNTIL };
      expect(service.areObjectsDirty()).toBe(false);
    });

    it('counts a changed from date and is clean again on the loaded value', () => {
      load();

      form().internalFromDate = { year: 2026, month: 12, day: 2 };
      expect(service.areObjectsDirty()).toBe(true);

      form().internalFromDate = { ...LOADED_FROM };
      expect(service.areObjectsDirty()).toBe(false);
    });
  });

  it('counts a changed start time and is clean again on the loaded value', () => {
    load();

    form().internalStartShift = new OwnTime('08', '30', false);
    expect(service.areObjectsDirty()).toBe(true);

    form().internalStartShift = new OwnTime('07', '00', false);
    expect(service.areObjectsDirty()).toBe(false);
  });

  it('counts a changed end time and is clean again on the loaded value', () => {
    load();

    form().internalEndShift = new OwnTime('16', '00', false);
    expect(service.areObjectsDirty()).toBe(true);

    form().internalEndShift = new OwnTime('15', '00', false);
    expect(service.areObjectsDirty()).toBe(false);
  });

  it('counts a cleared until date, an open end is a real change', () => {
    load();

    form().internalUntilDate = undefined;

    expect(service.areObjectsDirty()).toBe(true);
  });

  it('is clean for a shift without an until date', () => {
    load({ ...LOADED_SHIFT, untilDate: null });

    expect(service.areObjectsDirty()).toBe(false);
  });

  it('does not treat a half-typed date as a change and keeps the loaded dates', () => {
    load();

    form().internalFromDate = '12.1' as unknown as NgbDateStruct;
    form().internalUntilDate = '14' as unknown as NgbDateStruct;

    expect(service.areObjectsDirty()).toBe(false);
    expect(calendarDateKey(service.editShift?.fromDate)).toBe('2026-12-01');
    expect(calendarDateKey(service.editShift?.untilDate)).toBe('2026-12-14');
  });

  it('saves a change of the date alone, and is clean after the answer of the server', () => {
    load();
    form().internalUntilDate = { year: 2026, month: 12, day: 20 };

    service.save();
    const request = http.expectOne(SHIFT_URL);
    expect(request.request.method).toBe('PUT');
    expect(calendarDateKey(request.request.body.untilDate)).toBe('2026-12-20');
    request.flush({ ...LOADED_SHIFT, untilDate: '2026-12-20T00:00:00' });

    expect(service.areObjectsDirty()).toBe(false);
    settle();
    expect(service.areObjectsDirty()).toBe(false);
  });

  it('is clean after a reset and shows the loaded value again', () => {
    load();
    form().internalUntilDate = { year: 2026, month: 12, day: 20 };
    expect(service.areObjectsDirty()).toBe(true);

    service.resetData();

    expect(service.areObjectsDirty()).toBe(false);
    settle();
    expect(service.areObjectsDirty()).toBe(false);
    expect(form().internalUntilDate).toEqual(expect.objectContaining(LOADED_UNTIL));
  });

  describe.each([
    ['a sealed order', ShiftStatus.SealedOrder],
    ['a plannable copy', ShiftStatus.OriginalShift],
    ['a cut piece', ShiftStatus.SplitShift],
  ])('on %s of the real plan, whose family the server ends as a whole', (_name, status) => {
    const SET_UNTIL: NgbDateStruct = { year: 2026, month: 12, day: 20 };

    beforeEach(() => {
      load({ ...LOADED_SHIFT, untilDate: null, status });
    });

    it('counts setting the until date, and is clean again when it is cleared', () => {
      form().internalUntilDate = SET_UNTIL;
      expect(service.areObjectsDirty()).toBe(true);

      form().internalUntilDate = undefined;
      expect(service.areObjectsDirty()).toBe(false);
    });

    it('does not count a changed time', () => {
      form().internalStartShift = new OwnTime('08', '30', false);

      expect(service.areObjectsDirty()).toBe(false);
    });

    it('does not count a changed start date', () => {
      form().internalFromDate = { year: 2026, month: 12, day: 2 };

      expect(service.areObjectsDirty()).toBe(false);
    });

    it('captures a draft for the until date, not for a changed time', () => {
      form().internalStartShift = new OwnTime('08', '30', false);
      expect(service.captureDraft()).toBeNull();

      form().internalUntilDate = SET_UNTIL;
      expect(service.captureDraft()).not.toBeNull();
    });

    it('sends the until date with the stored dates and times, whatever the form holds', () => {
      form().internalUntilDate = SET_UNTIL;
      form().internalStartShift = new OwnTime('08', '30', false);
      form().internalFromDate = { year: 2026, month: 12, day: 2 };

      service.save();

      const request = http.expectOne(SHIFT_URL);
      const body = request.request.body as Record<string, unknown>;
      expect(calendarDateKey(body['untilDate'] as string)).toBe('2026-12-20');
      expect(calendarDateKey(body['fromDate'] as string)).toBe('2026-12-01');
      expect(body['startShift']).toBe('07:00:00');
      expect(body['workTime']).toBe(7.33);
      request.flush({ ...LOADED_SHIFT, untilDate: '2026-12-20T00:00:00', status });
    });

    it('keeps the typed until date when the server refuses it', () => {
      const onRefused = vi.fn();
      service.onSaveRefused = onRefused;
      form().internalUntilDate = SET_UNTIL;

      service.save();
      http.expectOne(SHIFT_URL).flush({ errorCode: 'SHIFT_END_DATE_REFUSED' }, { status: 409, statusText: 'Conflict' });
      settle();

      expect(onRefused).toHaveBeenCalledTimes(1);
      expect(form().internalUntilDate).toEqual(SET_UNTIL);
      expect(service.areObjectsDirty()).toBe(true);
      expect(service.isEndDateOpen()).toBe(true);
    });

    it('has nothing left to save right after a successful save, before the form is rebuilt', () => {
      form().internalUntilDate = SET_UNTIL;

      service.save();
      http.expectOne(SHIFT_URL).flush({ ...LOADED_SHIFT, untilDate: '2026-12-20T00:00:00', status });

      expect(service.hasChangesToLose()).toBe(false);
    });

    it('offers the end date until it is saved, and locks it afterwards', () => {
      expect(service.isEndDateOpen()).toBe(true);
      expect(service.hasStoredUntilDate()).toBe(false);

      load({ ...LOADED_SHIFT, status });

      expect(service.isEndDateOpen()).toBe(false);
      expect(service.hasStoredUntilDate()).toBe(true);
    });

    it('does not count a changed stored until date, the server keeps it', () => {
      load({ ...LOADED_SHIFT, status });
      form().internalUntilDate = SET_UNTIL;

      expect(service.areObjectsDirty()).toBe(false);
    });

    it('still counts a change of another field', () => {
      service.editShift!.name = 'Renamed';

      expect(service.areObjectsDirty()).toBe(true);
    });
  });

  describe('on the sealed order of the key being edited', () => {
    beforeEach(() => {
      TestBed.inject(ScenarioVariantService).enter({
        id: 'variant-1',
        name: 'Winter key',
        groupId: 'group-1',
        fromDate: '2026-12-01',
        untilDate: '2026-12-31',
        token: KEY_TOKEN,
        status: AnalyseScenarioStatus.Active,
        isExpired: false,
        shiftCount: 1,
      });
      load({ ...LOADED_SHIFT, status: ShiftStatus.SealedOrder, analyseToken: KEY_TOKEN });
    });

    it('counts a changed until date and is clean again on the loaded value', () => {
      form().internalUntilDate = { year: 2026, month: 12, day: 20 };
      expect(service.areObjectsDirty()).toBe(true);

      form().internalUntilDate = { ...LOADED_UNTIL };
      expect(service.areObjectsDirty()).toBe(false);
    });

    it('captures a draft for a change of date alone', () => {
      form().internalUntilDate = { year: 2026, month: 12, day: 20 };

      expect(service.captureDraft()).not.toBeNull();
    });
  });

  it('reports unsaved changes for leaving without turning on the validation display', () => {
    load();
    service.editShift!.name = 'Renamed';

    expect(service.hasChangesToLose()).toBe(true);
    expect(service.makeValidation()).toBe(false);
  });

  it('also reports a change the save button would not offer, so an invalid form is not lost silently', () => {
    load();
    service.editShift!.name = '';

    expect(service.areObjectsDirty()).toBe(false);
    expect(service.hasChangesToLose()).toBe(true);
  });

  it('is clean for an untouched new shift', () => {
    service.createShift();
    http.match(() => true);
    settle();

    expect(service.areObjectsDirty()).toBe(false);
  });
});
