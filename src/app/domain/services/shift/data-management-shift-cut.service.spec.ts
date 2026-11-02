// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/shift/data-shift-cuts.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { DomainEventType } from 'src/app/domain/events/domain-event-type.enum';
import { environment } from 'src/environments/environment';
import {
    SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY,
    SCENARIO_VARIANT_RETURN_ROUTE,
} from 'src/app/domain/constants/scenario-variant.constants';

describe('DataManagementShiftCutService', () => {
    let service: DataManagementShiftCutService;
    let mockEventBus: any;
    let mockDataShiftCutsService: any;

    beforeEach(() => {
        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
            onAny: vi.fn()
        };
        mockDataShiftCutsService = {
            getCutShiftList: vi.fn(),
            addCuts: vi.fn(),
            updateCuts: vi.fn()
        };
        const mockRegistry = {
            register: vi.fn(),
            get: vi.fn().mockReturnValue(null),
            has: vi.fn().mockReturnValue(false),
            clear: vi.fn(),
            getRegisteredRoutes: vi.fn().mockReturnValue([])
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
                { provide: DataShiftCutsService, useValue: mockDataShiftCutsService },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
                { provide: PERMISSION_CHECKER, useValue: { hasPermission: () => false, isAdmin: false } },
                WorkTimeCalculationService
            ]
        });
        service = TestBed.inject(DataManagementShiftCutService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should implement the necessary interfaces', () => {
        expect(service.save).toBeDefined();
        expect(service.resetData).toBeDefined();
        expect(service.goBack).toBeDefined();
        expect(service.areObjectsDirty).toBeDefined();
        expect(service.showProgressSpinner).toBeDefined();
    });

    describe('variant mode when a cut list is opened', () => {
        const VARIANT_TOKEN = 'variant-token-1';

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

        const shiftWithToken = (analyseToken: string | undefined): Shift => {
            const shift = new Shift();
            shift.analyseToken = analyseToken;
            return shift;
        };

        const openCutList = (shifts: Shift[]) => {
            mockDataShiftCutsService.getCutShiftList.mockReturnValue(of(shifts));
            service.readCutShiftList('shift-1');
        };

        it('ends variant mode and tells the user when the cut list belongs to a real shift', () => {
            enterVariant();

            openCutList([shiftWithToken(undefined), shiftWithToken(undefined)]);

            expect(TestBed.inject(ScenarioVariantService).isVariantMode()).toBe(false);
            expect(mockEventBus.emit).toHaveBeenCalledWith(DomainEventType.INFO, expect.objectContaining({
                message: SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY,
            }));
        });

        it('keeps variant mode when the whole cut list belongs to the active variant', () => {
            enterVariant();

            openCutList([shiftWithToken(VARIANT_TOKEN), shiftWithToken(VARIANT_TOKEN)]);

            expect(TestBed.inject(ScenarioVariantService).isVariantMode()).toBe(true);
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        it('says nothing when a real cut list is opened outside variant mode', () => {
            openCutList([shiftWithToken(undefined)]);

            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });
    });

    describe('analyse token stamp on save', () => {
        const VARIANT_TOKEN = 'variant-token-1';

        const enterVariant = (token: string) =>
            TestBed.inject(ScenarioVariantService).enter({
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

        const newCut = (): Shift => {
            const cut = new Shift();
            cut.id = 'cut-1';
            cut.parentId = 'shift-1';
            cut.isNew = true;
            return cut;
        };

        const saveCutsAndCapture = (cut: Shift) => {
            mockDataShiftCutsService.batchCuts = vi.fn().mockReturnValue(of([]));
            service.cutShiftsDummy = [];
            service.cutShifts = [cut];
            service.save();
            return mockDataShiftCutsService.batchCuts.mock.calls[0][0] as { type: string; data: Shift }[];
        };

        it('leaves the token of a new cut to the server, which takes it from the stored parent', () => {
            enterVariant(VARIANT_TOKEN);

            const operations = saveCutsAndCapture(newCut());

            expect(operations[0].type).toBe('CREATE');
            expect(operations[0].data.analyseToken).toBeUndefined();
        });

        it('keeps the token a cut inherited from its variant shift', () => {
            enterVariant(VARIANT_TOKEN);
            const cut = newCut();
            cut.analyseToken = VARIANT_TOKEN;

            const operations = saveCutsAndCapture(cut);

            expect(operations[0].data.analyseToken).toBe(VARIANT_TOKEN);
        });

        it('adds no token to a cut outside variant mode', () => {
            const operations = saveCutsAndCapture(newCut());

            expect(operations[0].data.analyseToken).toBeUndefined();
        });
    });

    describe('a refused cut', () => {
        const REFUSAL = new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { errorCode: 'SCENARIO_VARIANT_IN_USE' },
        });
        const FAILURE = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });

        const errorEmits = () => mockEventBus.emit.mock.calls.filter(([type]: [DomainEventType]) => type === DomainEventType.ERROR);

        const failSave = (failure: HttpErrorResponse) => {
            mockDataShiftCutsService.batchCuts = vi.fn().mockReturnValue(throwError(() => failure));
            const cut = new Shift();
            cut.id = 'cut-1';
            cut.parentId = 'shift-1';
            cut.isNew = true;
            service.cutShiftsDummy = [];
            service.cutShifts = [cut];
            service.save();
        };

        const failReset = (failure: HttpErrorResponse) => {
            mockDataShiftCutsService.resetCuts = vi.fn().mockReturnValue(throwError(() => failure));
            service.resetCuts('shift-1', new Date(2026, 10, 2));
        };

        it('emits no raw error on a refused save, the interceptor explains that', () => {
            failSave(REFUSAL);

            expect(errorEmits()).toEqual([]);
        });

        it('leaves the report of a failed save to the interceptor', () => {
            failSave(FAILURE);

            expect(errorEmits()).toEqual([]);
        });

        it('reports a failure no request has seen', () => {
            failSave(new TypeError('mapping failed') as unknown as HttpErrorResponse);

            expect(errorEmits().length).toBe(1);
            expect(errorEmits()[0][1].message).toBe('HTTP_ERROR_UNKNOWN');
        });

        it('tells the save bar that the cut was refused, so save and close stays on the form', () => {
            const completed = vi.fn();
            const refused = vi.fn();
            service.onSaveCompleted = completed;
            service.onSaveRefused = refused;

            failSave(REFUSAL);

            expect(refused).toHaveBeenCalledTimes(1);
            expect(completed).not.toHaveBeenCalled();
        });

        describe.each([[0], [502], [504]])('while the server cannot be reached (status %i)', (status) => {
            const unreachable = new HttpErrorResponse({
                status,
                url: `${environment.baseUrl}Shifts/Cuts`,
            });

            it('stays on the form, so save and close does not leave it', () => {
                const completed = vi.fn();
                const refused = vi.fn();
                service.onSaveCompleted = completed;
                service.onSaveRefused = refused;

                failSave(unreachable);

                expect(refused).toHaveBeenCalledTimes(1);
                expect(completed).not.toHaveBeenCalled();
                expect(service.cutShifts.length).toBe(1);
            });

            it('says so once, and the message passes the silent outage suspicion', () => {
                failSave(unreachable);

                expect(errorEmits().length).toBe(1);
                expect(errorEmits()[0][1].message).toBe('save.error.backendUnreachable');
                expect(errorEmits()[0][1].showDuringOutage).toBe(true);
            });

            it('says so on a failed reset as well', () => {
                failReset(unreachable);

                expect(errorEmits().length).toBe(1);
                expect(errorEmits()[0][1].message).toBe('save.error.backendUnreachable');
            });
        });

        it('leaves a foreign gateway failure to the normal path', () => {
            const refused = vi.fn();
            service.onSaveRefused = refused;

            failSave(new HttpErrorResponse({ status: 502, url: 'https://third-party.example.com/route' }));

            expect(refused).not.toHaveBeenCalled();
            expect(errorEmits()).toEqual([]);
        });

        it('emits no raw error on a refused reset, the interceptor explains that', () => {
            failReset(REFUSAL);

            expect(errorEmits()).toEqual([]);
        });

        it('leaves the report of a failed reset to the interceptor', () => {
            failReset(FAILURE);

            expect(errorEmits()).toEqual([]);
        });
    });

    describe('goBack', () => {
        it('should return correct path', () => {
            const result = service.goBack();
            expect(result).toBe('/workplace/shift');
        });

        it('leads to the schedule for the cuts of a key shift, even when variant mode has ended', () => {
            const cut = new Shift();
            cut.analyseToken = 'variant-token-1';
            service.cutShifts = [cut];

            expect(service.goBack()).toBe('/workplace/schedule');
        });

        it('leads to the schedule in variant mode, because the shift list shows real shifts only', () => {
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

            expect(service.goBack()).toBe(SCENARIO_VARIANT_RETURN_ROUTE);
        });
    });
});
