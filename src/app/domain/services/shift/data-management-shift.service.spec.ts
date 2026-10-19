// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { of } from 'rxjs';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { ShiftRequiredQualification } from 'src/app/domain/models/shift/shift-required-qualification-class';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { SessionStorageService } from 'src/app/infrastructure/storage/session-storage.service';
import { environment } from 'src/environments/environment';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

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
                { provide: DataManagementCalendarSelectionService, useValue: calendarSelectionSpy }
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
