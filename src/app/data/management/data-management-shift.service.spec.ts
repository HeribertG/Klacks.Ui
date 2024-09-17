import { TestBed } from '@angular/core/testing';

import { DataManagementShiftService } from './data-management-shift.service';

describe('DataManagementShiftService', () => {
  let service: DataManagementShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
