/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/shift/data-shift-cuts.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

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
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
                { provide: DataShiftCutsService, useValue: mockDataShiftCutsService },
                { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
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

    describe('goBack', () => {
        it('should return correct path', () => {
            const result = service.goBack();
            expect(result).toBe('/workplace/shift');
        });
    });
});
