import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { of } from 'rxjs';

class MockEventBus implements IEventBus {
  emit<_T>(_eventType: string, _payload: _T): void {}
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
        WorkTimeCalculationService,
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry }
      ]
    });
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
