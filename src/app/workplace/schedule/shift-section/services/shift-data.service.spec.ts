import { TestBed } from '@angular/core/testing';

import { ShiftDataService } from './shift-data.service';

describe('ShiftDataService', () => {
  let service: ShiftDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShiftDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
