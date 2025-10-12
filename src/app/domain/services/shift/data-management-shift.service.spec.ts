import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataManagementShiftService', () => {
  let service: DataManagementShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkTimeCalculationService
      ]
    });
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
