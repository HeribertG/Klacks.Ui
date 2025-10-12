import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataManagementShiftCutService', () => {
  let service: DataManagementShiftCutService;
  let mockEventBus: jasmine.SpyObj<EventBus>;
  let mockDataShiftCutsService: jasmine.SpyObj<DataShiftCutsService>;

  beforeEach(() => {
    mockEventBus = jasmine.createSpyObj('EventBus', ['emit']);
    mockDataShiftCutsService = jasmine.createSpyObj('DataShiftCutsService', ['getCutShiftList', 'addCuts', 'updateCuts']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EventBus, useValue: mockEventBus },
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