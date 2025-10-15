import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';
import { IEventBus, EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataManagementShiftCutService', () => {
  let service: DataManagementShiftCutService;
  let mockEventBus: jasmine.SpyObj<IEventBus>;
  let mockDataShiftCutsService: jasmine.SpyObj<DataShiftCutsService>;

  beforeEach(() => {
    mockEventBus = jasmine.createSpyObj('IEventBus', ['emit', 'on', 'onAny']);
    mockDataShiftCutsService = jasmine.createSpyObj('DataShiftCutsService', ['getCutShiftList', 'addCuts', 'updateCuts']);
    const mockRegistry = {
      register: jasmine.createSpy('register'),
      get: jasmine.createSpy('get').and.returnValue(null),
      has: jasmine.createSpy('has').and.returnValue(false),
      clear: jasmine.createSpy('clear'),
      getRegisteredRoutes: jasmine.createSpy('getRegisteredRoutes').and.returnValue([])
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