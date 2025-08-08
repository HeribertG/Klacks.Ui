import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // HttpClientTestingModule importieren
import { DataShiftService } from './data-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';

describe('DataShiftService', () => {
  let service: DataShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // HttpClientTestingModule hinzufügen
      providers: [WorkTimeCalculationService] // WorkTimeCalculationService hinzufügen
    });
    service = TestBed.inject(DataShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
