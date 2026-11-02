// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { of, Subject } from 'rxjs';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { ShiftRequiredQualification } from 'src/app/domain/models/shift/shift-required-qualification-class';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';
import { cloneObject } from 'src/app/domain/helpers/object.helper';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { DomainEventType } from 'src/app/domain/events/domain-event-type.enum';
import { ErrorEvent } from 'src/app/domain/events/domain-events';
import {
    SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY,
    SCENARIO_VARIANT_RETURN_ROUTE,
} from 'src/app/domain/constants/scenario-variant.constants';
import { Group } from 'src/app/domain/models/group/group-class';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { SessionStorageService } from 'src/app/infrastructure/storage/session-storage.service';
import { environment } from 'src/environments/environment';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { calendarDateKey, companyToday } from 'src/app/domain/helpers/calendar-date.helper';

const DRAFT_ROUND_TRIP_KEY = 'shift-draft-round-trip-spec';

class MockEventBus implements IEventBus {
    emit<_T>(_eventType: string, _payload: _T): void { }
    on<_T>(_eventType: string) {
        return of();
    }
    onAny() {
        return of();
    }
}

describe('DataManagementShiftService', () => {
    let service: DataManagementShiftService;
    let mockEventBus: MockEventBus;

    beforeEach(() => {
        mockEventBus = new MockEventBus();
        const mockRegistry = {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(null),
            has: vi.fn().mockReturnValue(false),
            clear: vi.fn(),
            getRegisteredRoutes: vi.fn().mockReturnValue([])
        };
        const translateSpy = {
            instant: vi.fn().mockReturnValue(''),
            get: vi.fn().mockReturnValue(of('')),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
        };
        const calendarSelectionSpy = {
            isRead: vi.fn().mockReturnValue(false),
            readData: vi.fn(),
            calendarsSelections: [],
            chips: []
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                WorkTimeCalculationService,
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
                { provide: TranslateService, useValue: translateSpy },
                { provide: PERMISSION_CHECKER, useValue: { hasPermission: () => false, isAdmin: false } },
                { provide: DataManagementCalendarSelectionService, useValue: calendarSelectionSpy },
                {
                    provide: SCHEDULE_SIGNALR,
                    useValue: { wizard4CandidatesChanged$: new Subject(), autofillRunEnded$: new Subject() }
                }
            ]
        });
        service = TestBed.inject(DataManagementShiftService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('captureDraft', () => {
        it('captures an incomplete shift that diverges from the server baseline', () => {
            const baseline = new Shift();
            service.editShiftDummy = baseline;
            const edited = cloneObject<Shift>(baseline);
            edited.name = 'Half-typed name';
            service.editShift = edited;

            const draft = service.captureDraft() as Shift | null;

            expect(draft).not.toBeNull();
            expect(draft!.name).toBe('Half-typed name');
        });

        it('returns null when the shift is unchanged', () => {
            const baseline = new Shift();
            baseline.name = 'Unchanged';
            service.editShift = baseline;
            service.editShiftDummy = cloneObject<Shift>(baseline);

            expect(service.captureDraft()).toBeNull();
        });

        it('returns null when there is no shift in edit', () => {
            service.editShift = undefined;
            service.editShiftDummy = undefined;

            expect(service.captureDraft()).toBeNull();
        });
    });

    describe('restoreDraft', () => {
        it('applies the draft to editShift while preserving the server baseline', () => {
            const baseline = new Shift();
            baseline.name = 'Server value';
            service.editShift = cloneObject<Shift>(baseline);
            service.editShiftDummy = baseline;

            service.restoreDraft({ id: '5', name: 'Draft value' });

            expect(service.editShift).toBeInstanceOf(Shift);
            expect(service.editShift!.name).toBe('Draft value');
            expect(service.editShift!.id).toBe('5');
            expect(service.editShiftDummy!.name).toBe('Server value');
        });

        it('ignores a null draft', () => {
            const current = new Shift();
            current.name = 'Current';
            service.editShift = current;

            service.restoreDraft(null);

            expect(service.editShift!.name).toBe('Current');
        });

        for (const zone of CALENDAR_TEST_ZONES) {
            describe(`after a session-storage round trip in ${zone}`, () => {
                useTimeZone(zone);

                afterEach(async () => {
                    await TestBed.inject(SessionStorageService).removeFilter(DRAFT_ROUND_TRIP_KEY);
                    TestBed.inject(HttpTestingController).verify();
                });

                it('sends the restored fromDate as the same calendar day', async () => {
                    const storage = TestBed.inject(SessionStorageService);
                    const edited = new Shift();
                    edited.name = 'Draft value';
                    edited.fromDate = new Date(2026, 7, 3);
                    edited.untilDate = new Date(2026, 8, 30);

                    await storage.saveFilter(DRAFT_ROUND_TRIP_KEY, { draft: cloneObject<Shift>(edited) });
                    const payload = await storage.restoreFilter<{ draft: unknown }>(DRAFT_ROUND_TRIP_KEY);
                    service.restoreDraft(payload!.draft);

                    TestBed.inject(DataShiftService).addShift(service.editShift!).subscribe();

                    const req = TestBed.inject(HttpTestingController).expectOne(`${environment.baseUrl}Shifts/`);
                    expect(req.request.body.fromDate).toBe('2026-08-03T00:00:00.000Z');
                    expect(req.request.body.untilDate).toBe('2026-09-30T00:00:00.000Z');
                    req.flush(new Shift());
                });
            });
        }
    });

    describe('required qualification level binding', () => {
        const requirement = (qualificationId: string, levelBindingOverride: boolean | null): ShiftRequiredQualification => {
            const row = new ShiftRequiredQualification();
            row.qualificationId = qualificationId;
            row.isMandatory = true;
            row.minLevel = QualificationLevel.Proficient;
            row.levelBindingOverride = levelBindingOverride;
            return row;
        };

        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
        });

        it('defaults a new requirement row to "as the qualification" (null, not false)', () => {
            expect(new ShiftRequiredQualification().levelBindingOverride).toBeNull();
        });

        it('treats switching a requirement from inherit (null) to hint only (false) as an unsaved change', () => {
            const baseline = new Shift();
            baseline.id = 'shift-1';
            baseline.requiredQualifications = [requirement('q-1', null)];
            service.editShiftDummy = baseline;
            const edited = cloneObject<Shift>(baseline);
            edited.requiredQualifications[0].levelBindingOverride = false;
            service.editShift = edited;

            const draft = service.captureDraft() as Shift | null;

            expect(draft).not.toBeNull();
            expect(draft!.requiredQualifications[0].levelBindingOverride).toBe(false);
        });

        it('keeps null, true and false through a draft restore and sends them unchanged in the shift PUT', () => {
            const edited = new Shift();
            edited.id = 'shift-1';
            edited.name = 'Night care';
            edited.requiredQualifications = [
                requirement('q-inherit', null),
                requirement('q-binding', true),
                requirement('q-hint', false),
            ];

            service.restoreDraft(cloneObject<Shift>(edited));
            TestBed.inject(DataShiftService).updateShift(service.editShift!).subscribe();

            const req = TestBed.inject(HttpTestingController).expectOne(`${environment.baseUrl}Shifts/`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body.requiredQualifications.map(
                (row: ShiftRequiredQualification) => [row.qualificationId, row.levelBindingOverride],
            )).toEqual([
                ['q-inherit', null],
                ['q-binding', true],
                ['q-hint', false],
            ]);
            req.flush(new Shift());
        });
    });

    describe('analyse token stamp', () => {
        const VARIANT_TOKEN = 'variant-token-1';

        const variant = (token: string) => ({
            id: 'variant-1',
            name: 'Winter key',
            groupId: 'group-1',
            fromDate: '2026-11-02',
            untilDate: '2026-11-29',
            token,
            status: AnalyseScenarioStatus.Active,
            isExpired: false,
            shiftCount: 0,
        });

        const savableShift = (): Shift => {
            const shift = new Shift();
            shift.name = 'Night care';
            shift.abbreviation = 'NC';
            shift.startShift = '22:00:00';
            shift.isMonday = true;
            return shift;
        };

        const saveAndCapture = (shift: Shift, method: 'POST' | 'PUT') => {
            service.editShift = shift;
            service.editShiftDummy = new Shift();
            service.save();
            const req = TestBed.inject(HttpTestingController).expectOne(`${environment.baseUrl}Shifts/`);
            expect(req.request.method).toBe(method);
            const body = req.request.body;
            req.flush(new Shift());
            return body;
        };

        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
        });

        it('adds no token at save time to a shift whose form was opened outside variant mode', () => {
            TestBed.inject(ScenarioVariantService).enter(variant(VARIANT_TOKEN));

            const body = saveAndCapture(savableShift(), 'POST');

            expect(body.analyseToken).toBeUndefined();
        });

        it('gives a shift created in scenario mode no token, because a shift never gets a scenario token', () => {
            TestBed.inject(AnalyseScenarioService).selectScenario({
                ...variant('scenario-token-1'),
                createdByUser: 'user-1',
                variantIds: [],
            });

            const body = saveAndCapture(savableShift(), 'POST');

            expect(body.analyseToken).toBeUndefined();
        });

        it('keeps the variant token of a shift that is edited in variant mode', () => {
            TestBed.inject(ScenarioVariantService).enter(variant(VARIANT_TOKEN));
            const shift = savableShift();
            shift.id = 'shift-1';
            shift.analyseToken = VARIANT_TOKEN;

            const body = saveAndCapture(shift, 'PUT');

            expect(body.analyseToken).toBe(VARIANT_TOKEN);
        });

        it('keeps the token a variant shift carries when it is saved outside variant mode', () => {
            const shift = savableShift();
            shift.id = 'shift-1';
            shift.analyseToken = VARIANT_TOKEN;

            const body = saveAndCapture(shift, 'PUT');

            expect(body.analyseToken).toBe(VARIANT_TOKEN);
        });

        it('does not pull an existing real shift into the variant when it is saved in variant mode', () => {
            TestBed.inject(ScenarioVariantService).enter(variant(VARIANT_TOKEN));
            const shift = savableShift();
            shift.id = 'shift-1';

            const body = saveAndCapture(shift, 'PUT');

            expect(body.analyseToken).toBeUndefined();
        });

        it('leaves a real shift without a token when neither mode is active', () => {
            const body = saveAndCapture(savableShift(), 'POST');

            expect(body.analyseToken).toBeUndefined();
        });
    });

    describe('new shift in variant mode', () => {
        const GROUP_ID = 'group-1';
        const MACRO_URL = `${environment.baseUrl}Macros/Macros/DefaultShift`;

        const enterVariant = () =>
            TestBed.inject(ScenarioVariantService).enter({
                id: 'variant-1',
                name: 'Winter key',
                groupId: GROUP_ID,
                fromDate: '2026-11-02',
                untilDate: '2026-11-29',
                token: 'variant-token-1',
                status: AnalyseScenarioStatus.Active,
                isExpired: false,
                shiftCount: 0,
            });

        afterEach(() => {
            TestBed.inject(HttpTestingController).match(MACRO_URL);
        });

        it('is assigned to the group of the key, so the backend refusal for a shift without a group does not fire', () => {
            TestBed.inject(DataManagementGroupService).flatNodeList = [new Group({ id: GROUP_ID, name: 'Night care' })];
            enterVariant();

            service.createShift();

            expect(service.editShift!.groups.map((group) => group.id)).toEqual([GROUP_ID]);
            expect(service.editShift!.groups[0].name).toBe('Night care');
        });

        it('keeps the group when the group tree does not hold it yet', () => {
            TestBed.inject(DataManagementGroupService).flatNodeList = [];
            enterVariant();

            service.createShift();

            expect(service.editShift!.groups.map((group) => group.id)).toEqual([GROUP_ID]);
        });

        it('does not count the preassigned group as an unsaved change', () => {
            TestBed.inject(DataManagementGroupService).flatNodeList = [new Group({ id: GROUP_ID, name: 'Night care' })];
            enterVariant();

            service.createShift();

            expect(service.captureDraft()).toBeNull();
        });

        it('leaves the group of a new real shift empty outside variant mode', () => {
            service.createShift();

            expect(service.editShift!.groups).toEqual([]);
        });

        it('carries the token of the key from the moment the form opens, without counting as an unsaved change', () => {
            TestBed.inject(DataManagementGroupService).flatNodeList = [new Group({ id: GROUP_ID, name: 'Night care' })];
            enterVariant();

            service.createShift();

            expect(service.editShift!.analyseToken).toBe('variant-token-1');
            expect(service.captureDraft()).toBeNull();
        });

        it('leaves a new real shift without a token outside variant mode', () => {
            service.createShift();

            expect(service.editShift!.analyseToken).toBeUndefined();
        });

        it('saves a form opened in variant mode into the key, even when the mode ended before the save', () => {
            TestBed.inject(DataManagementGroupService).flatNodeList = [new Group({ id: GROUP_ID, name: 'Night care' })];
            enterVariant();
            service.createShift();
            service.editShift!.name = 'Night care';
            service.editShift!.abbreviation = 'NC';
            TestBed.inject(ScenarioVariantService).leave();

            service.save();

            const http = TestBed.inject(HttpTestingController);
            const req = http.expectOne(`${environment.baseUrl}Shifts/`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body.analyseToken).toBe('variant-token-1');
            expect(req.request.body.groups.map((group: Group) => group.id)).toEqual([GROUP_ID]);
            req.flush(new Shift());
        });
    });

    describe('a refused save', () => {
        const ATTEMPTS_OF_A_SERVER_FAILURE = 4;

        const refuseSave = (
            body: Record<string, string> | null,
            status: number,
            statusText: string,
            id = 'shift-1',
            attempts = 1,
        ) => {
            const shift = new Shift();
            shift.id = id;
            shift.name = 'Night care';
            shift.abbreviation = 'NC';
            shift.startShift = '22:00:00';
            shift.isMonday = true;
            service.editShift = shift;
            service.editShiftDummy = new Shift();

            service.save();

            const http = TestBed.inject(HttpTestingController);
            for (let attempt = 0; attempt < attempts; attempt++) {
                http.expectOne((request) => request.url === `${environment.baseUrl}Shifts/`).flush(body, { status, statusText });
            }
            const reads = http.match((request) => request.method === 'GET' && request.url.includes('Shifts/'));
            http.match(() => true);
            return { shift, reads };
        };

        const emitted: string[] = [];
        const errorPayloads: ErrorEvent[] = [];

        beforeEach(() => {
            emitted.length = 0;
            errorPayloads.length = 0;
            vi.spyOn(mockEventBus, 'emit').mockImplementation((type: string, payload?: unknown) => {
                emitted.push(type);
                if (type === DomainEventType.ERROR) {
                    errorPayloads.push(payload as ErrorEvent);
                }
            });
        });

        const failUnreachable = (id: string, status: number) => {
            const shift = new Shift();
            shift.id = id;
            shift.name = 'Night care';
            shift.abbreviation = 'NC';
            shift.startShift = '22:00:00';
            shift.isMonday = true;
            service.editShift = shift;
            service.editShiftDummy = new Shift();

            service.save();

            const http = TestBed.inject(HttpTestingController);
            const open = () => http.match((request) => request.url === `${environment.baseUrl}Shifts/`);
            for (let attempts = open(); attempts.length > 0; attempts = open()) {
                attempts.forEach((attempt) =>
                    status === 0
                        ? attempt.error(new ProgressEvent('error'))
                        : attempt.flush(null, { status, statusText: 'Gateway' }));
            }
            const reads = http.match((request) => request.method === 'GET' && request.url.includes('Shifts/'));
            http.match(() => true);
            return { shift, reads };
        };

        describe.each([
            ['an update', 'shift-1'],
            ['a new shift', ''],
        ])('%s while the server cannot be reached', (_case, id) => {
            it.each([[0], [502], [504]])('stays on the form with everything typed on status %i', (status) => {
                const completed = vi.fn();
                const refused = vi.fn();
                service.onSaveCompleted = completed;
                service.onSaveRefused = refused;
                service.isSaveAndClose = true;

                const { shift, reads } = failUnreachable(id, status);

                expect(refused).toHaveBeenCalledTimes(1);
                expect(completed).not.toHaveBeenCalled();
                expect(service.isSaveAndClose).toBe(false);
                expect(service.editShift).toBe(shift);
                expect(service.editShift?.name).toBe('Night care');
                expect(reads).toEqual([]);
            });

            it('says so once, and the message passes the silent outage suspicion', () => {
                failUnreachable(id, 0);

                expect(errorPayloads.length).toBe(1);
                expect(errorPayloads[0].message).toBe('save.error.backendUnreachable');
                expect(errorPayloads[0].showDuringOutage).toBe(true);
            });
        });

        const errorEmits = () => emitted.filter((type) => type === DomainEventType.ERROR);

        it('emits no raw error when a key refuses it, the interceptor explains that', () => {
            refuseSave({ errorCode: 'SCENARIO_VARIANT_IN_USE' }, 409, 'Conflict');

            expect(errorEmits()).toEqual([]);
        });

        it.each([
            ['a frozen key', { errorCode: 'SCENARIO_VARIANT_IN_USE' }, 409, 'Conflict'],
            ['an input the server refuses', null, 400, 'Bad Request'],
            ['a shift that is gone', null, 404, 'Not Found'],
        ])('keeps the form and everything typed on %s', (_case, body, status, statusText) => {
            const { shift, reads } = refuseSave(body, status, statusText);

            expect(service.editShift).toBe(shift);
            expect(service.editShift?.name).toBe('Night care');
            expect(reads).toEqual([]);
        });

        it('keeps a new shift that was refused, instead of opening an empty form', () => {
            const { shift } = refuseSave(null, 400, 'Bad Request', '');

            expect(service.editShift).toBe(shift);
            expect(service.editShift?.name).toBe('Night care');
        });

        it('tells the save bar that the save was refused, so save and close stays on the form', () => {
            const completed = vi.fn();
            const refused = vi.fn();
            service.onSaveCompleted = completed;
            service.onSaveRefused = refused;
            service.isSaveAndClose = true;

            refuseSave({ errorCode: 'SCENARIO_VARIANT_IN_USE' }, 409, 'Conflict');

            expect(refused).toHaveBeenCalledTimes(1);
            expect(completed).not.toHaveBeenCalled();
            expect(service.isSaveAndClose).toBe(false);
        });

        it('reloads after a server failure and leaves the report to the interceptor', () => {
            const completed = vi.fn();
            service.onSaveCompleted = completed;

            const { reads } = refuseSave(null, 500, 'Server Error', 'shift-1', ATTEMPTS_OF_A_SERVER_FAILURE);

            expect(reads.length).toBe(1);
            expect(errorEmits()).toEqual([]);
            expect(completed).toHaveBeenCalledTimes(1);
        });
    });

    describe('isCurrentShiftStatusLocked', () => {
        const KEY_TOKEN = 'key-token';

        const openShift = (status: ShiftStatus | undefined, id: string | undefined, analyseToken?: string) => {
            const shift = new Shift();
            shift.id = id;
            shift.status = status as ShiftStatus;
            shift.analyseToken = analyseToken;
            service.editShift = shift;
        };

        const enterKey = () =>
            TestBed.inject(ScenarioVariantService).enter({
                id: 'variant-1',
                name: 'Winter key',
                groupId: 'group-1',
                fromDate: '2026-11-02',
                untilDate: '2026-11-29',
                token: KEY_TOKEN,
                status: AnalyseScenarioStatus.Active,
                isExpired: false,
                shiftCount: 1,
            });

        it('does not lock a new clientless shift that is prepared as SealedOrder', () => {
            openShift(ShiftStatus.SealedOrder, undefined);

            expect(service.isCurrentShiftStatusLocked()).toBe(false);
        });

        it.each([
            ['sealed order', ShiftStatus.SealedOrder],
            ['plannable copy', ShiftStatus.OriginalShift],
            ['cut piece', ShiftStatus.SplitShift],
        ])('locks a saved %s', (_name, status) => {
            openShift(status, 'shift-1');

            expect(service.isCurrentShiftStatusLocked()).toBe(true);
        });

        it('does not lock an OriginalOrder shift', () => {
            openShift(ShiftStatus.OriginalOrder, 'shift-1');

            expect(service.isCurrentShiftStatusLocked()).toBe(false);
        });

        it('does not lock while no shift is loaded', () => {
            service.editShift = undefined;

            expect(service.isCurrentShiftStatusLocked()).toBe(false);
        });

        it('does not lock the sealed order of the active key, a key shift is always sealed', () => {
            enterKey();
            openShift(ShiftStatus.SealedOrder, 'shift-1', KEY_TOKEN);

            expect(service.isCurrentShiftStatusLocked()).toBe(false);
        });

        it('keeps a real sealed shift locked in variant mode', () => {
            enterKey();
            openShift(ShiftStatus.SealedOrder, 'shift-1');

            expect(service.isCurrentShiftStatusLocked()).toBe(true);
        });

        it('keeps the sealed order of another key locked', () => {
            enterKey();
            openShift(ShiftStatus.SealedOrder, 'shift-1', 'other-key-token');

            expect(service.isCurrentShiftStatusLocked()).toBe(true);
        });

        it('keeps a key shift locked when variant mode is off', () => {
            openShift(ShiftStatus.SealedOrder, 'shift-1', KEY_TOKEN);

            expect(service.isCurrentShiftStatusLocked()).toBe(true);
        });

        it.each([
            ['cut piece', ShiftStatus.SplitShift],
            ['plannable copy', ShiftStatus.OriginalShift],
        ])('keeps the %s of the active key locked, it is edited through the order and the cut screen', (_name, status) => {
            enterKey();
            openShift(status, 'shift-1', KEY_TOKEN);

            expect(service.isCurrentShiftStatusLocked()).toBe(true);
        });
    });

    describe('a new shift in variant mode', () => {
        const enterVariant = () =>
            TestBed.inject(ScenarioVariantService).enter({
                id: 'variant-1',
                name: 'Winter key',
                groupId: 'group-1',
                fromDate: '2026-12-01',
                untilDate: '2026-12-14T00:00:00Z',
                token: 'variant-token-1',
                status: AnalyseScenarioStatus.Active,
                isExpired: false,
                shiftCount: 0,
            });

        afterEach(() => {
            TestBed.inject(HttpTestingController).match(() => true);
        });

        describe.each(CALENDAR_TEST_ZONES)('in %s', (zone) => {
            useTimeZone(zone);

            it('starts with the period of the key, because the server refuses a key shift outside it', () => {
                enterVariant();

                service.createShift();

                expect(calendarDateKey(service.editShift?.fromDate)).toBe('2026-12-01');
                expect(calendarDateKey(service.editShift?.untilDate)).toBe('2026-12-14');
            });
        });

        it('keeps the period in the baseline, so it is not an unsaved change', () => {
            enterVariant();

            service.createShift();

            expect(calendarDateKey(service.editShiftDummy?.fromDate)).toBe('2026-12-01');
            expect(calendarDateKey(service.editShiftDummy?.untilDate)).toBe('2026-12-14');
        });

        it('leaves a new real shift open-ended from today outside variant mode', () => {
            service.createShift();

            expect(service.editShift?.untilDate).toBeUndefined();
            expect(calendarDateKey(service.editShift?.fromDate)).toBe(calendarDateKey(companyToday()));
        });
    });

    describe('where save and close and the back button lead', () => {
        const enterVariant = () =>
            TestBed.inject(ScenarioVariantService).enter({
                id: 'variant-1',
                name: 'Winter key',
                groupId: 'group-1',
                fromDate: '2026-11-02',
                untilDate: '2026-11-29',
                token: 'variant-token-1',
                status: AnalyseScenarioStatus.Active,
                isExpired: false,
                shiftCount: 0,
            });

        it('lead to the shift list outside variant mode', () => {
            expect(service.goBack()).toBe('/workplace/shift');
        });

        it('lead to the schedule in variant mode, because the shift list shows real shifts only', () => {
            enterVariant();

            expect(service.goBack()).toBe(SCENARIO_VARIANT_RETURN_ROUTE);
            expect(SCENARIO_VARIANT_RETURN_ROUTE).toBe('/workplace/schedule');
        });

        it('lead to the schedule for a key shift, even when variant mode has ended', () => {
            const keyShift = new Shift();
            keyShift.analyseToken = 'variant-token-1';
            service.editShift = keyShift;

            expect(service.goBack()).toBe(SCENARIO_VARIANT_RETURN_ROUTE);
        });

        it('lead to the explicit return address first', () => {
            enterVariant();
            service.returnUrl = '/workplace/client';

            expect(service.goBack()).toBe('/workplace/client');
        });
    });

    describe('variant mode when an existing shift is opened', () => {
        const VARIANT_TOKEN = 'variant-token-1';
        const SHIFT_URL = `${environment.baseUrl}Shifts/shift-1`;

        const enterVariant = () =>
            TestBed.inject(ScenarioVariantService).enter({
                id: 'variant-1',
                name: 'Winter key',
                groupId: 'group-1',
                fromDate: '2026-11-02',
                untilDate: '2026-11-29',
                token: VARIANT_TOKEN,
                status: AnalyseScenarioStatus.Active,
                isExpired: false,
                shiftCount: 0,
            });

        const openShift = (analyseToken: string | undefined) => {
            service.readShift('shift-1');
            const shift = new Shift();
            shift.id = 'shift-1';
            shift.analyseToken = analyseToken;
            TestBed.inject(HttpTestingController).expectOne(SHIFT_URL).flush(shift);
        };

        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
        });

        it('ends variant mode and tells the user when a real shift without token is opened', () => {
            enterVariant();
            const emit = vi.spyOn(mockEventBus, 'emit');

            openShift(undefined);

            expect(TestBed.inject(ScenarioVariantService).isVariantMode()).toBe(false);
            expect(emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({
                message: SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY,
            }));
        });

        it('keeps variant mode when the opened shift belongs to the active variant', () => {
            enterVariant();
            const emit = vi.spyOn(mockEventBus, 'emit');

            openShift(VARIANT_TOKEN);

            expect(TestBed.inject(ScenarioVariantService).isVariantMode()).toBe(true);
            expect(emit).not.toHaveBeenCalled();
        });

        it('says nothing when a real shift is opened outside variant mode', () => {
            const emit = vi.spyOn(mockEventBus, 'emit');

            openShift(undefined);

            expect(emit).not.toHaveBeenCalled();
        });
    });

    describe('default shift macro preselection', () => {
        const defaultMacroUrl = `${environment.baseUrl}Macros/Macros/DefaultShift`;
        const httpMock = () => TestBed.inject(HttpTestingController);

        afterEach(() => {
            httpMock().verify();
        });

        it('preselects the backend default macro on a new shift without marking it as changed', () => {
            service.createShift();

            httpMock().expectOne(defaultMacroUrl).flush({ macroId: 'macro-default' });

            expect(service.editShift!.macroId).toBe('macro-default');
            expect(service.editShiftDummy!.macroId).toBe('macro-default');
            expect(service.captureDraft()).toBeNull();
        });

        it('leaves the macro empty when the backend has no default configured', () => {
            service.createShift();

            httpMock().expectOne(defaultMacroUrl).flush({ macroId: null });

            expect(service.editShift!.macroId).toBeUndefined();
        });

        it('keeps a macro the user picked before the default arrived', () => {
            service.createShift();
            service.editShift!.macroId = 'macro-picked';

            httpMock().expectOne(defaultMacroUrl).flush({ macroId: 'macro-default' });

            expect(service.editShift!.macroId).toBe('macro-picked');
        });

        it('does not touch a shift that replaced the new one meanwhile', () => {
            service.createShift();
            const loaded = new Shift();
            loaded.id = 'shift-1';
            service.editShift = loaded;

            httpMock().expectOne(defaultMacroUrl).flush({ macroId: 'macro-default' });

            expect(service.editShift!.macroId).toBeUndefined();
        });

        it('leaves the macro empty when the lookup fails, so the backend fills it on save', () => {
            service.createShift();

            for (let attempt = 0; attempt < 4; attempt++) {
                httpMock().expectOne(defaultMacroUrl).flush('failure', { status: 500, statusText: 'Server Error' });
            }

            expect(service.editShift!.macroId).toBeUndefined();
        });
    });
});
