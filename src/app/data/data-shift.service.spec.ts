import { TestBed } from '@angular/core/testing';

import { DataShiftService } from './data-shift.service';

describe('DataShiftService', () => {
  let service: DataShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
