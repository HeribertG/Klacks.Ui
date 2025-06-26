import { TestBed } from '@angular/core/testing';

import { ScheduleDataService } from './schedule-data.service';

describe('ScheduleDataService', () => {
  let service: ScheduleDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
