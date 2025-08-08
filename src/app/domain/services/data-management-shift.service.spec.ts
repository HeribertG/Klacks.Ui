import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { DataManagementShiftService } from './data-management-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataManagementShiftService', () => {
  let service: DataManagementShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule], // HttpClientModule hinzufügen
      providers: [WorkTimeCalculationService] // WorkTimeCalculationService hinzufügen
    });
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
