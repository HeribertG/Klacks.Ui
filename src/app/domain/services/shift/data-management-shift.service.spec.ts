// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { of } from 'rxjs';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { cloneObject } from 'src/app/shared/helpers/object.helper';

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
    });
});
