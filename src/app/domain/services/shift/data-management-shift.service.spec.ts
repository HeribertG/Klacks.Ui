import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { of } from 'rxjs';

class MockEventBus implements IEventBus {
  emit<T>(eventType: string, payload: T): void {}
  on<T>(eventType: string) {
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

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkTimeCalculationService,
        { provide: EVENT_BUS_TOKEN, useValue: mockEventBus }
      ]
    });
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
