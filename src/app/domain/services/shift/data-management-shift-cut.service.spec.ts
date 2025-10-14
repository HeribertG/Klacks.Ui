import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';
import { IEventBus, EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataManagementShiftCutService', () => {
  let service: DataManagementShiftCutService;
  let mockEventBus: jasmine.SpyObj<IEventBus>;
  let mockDataShiftCutsService: jasmine.SpyObj<DataShiftCutsService>;

  beforeEach(() => {
    mockEventBus = jasmine.createSpyObj('IEventBus', ['emit', 'on', 'onAny']);
    mockDataShiftCutsService = jasmine.createSpyObj('DataShiftCutsService', ['getCutShiftList', 'addCuts', 'updateCuts']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
        { provide: DataShiftCutsService, useValue: mockDataShiftCutsService },
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