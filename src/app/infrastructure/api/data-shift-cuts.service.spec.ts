import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataShiftCutsService } from './data-shift-cuts.service';
import { WorkTimeCalculationService } from 'src/app/services/work-time-calculation.service';

describe('DataShiftCutsService', () => {
  let service: DataShiftCutsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WorkTimeCalculationService]
    });
    service = TestBed.inject(DataShiftCutsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});