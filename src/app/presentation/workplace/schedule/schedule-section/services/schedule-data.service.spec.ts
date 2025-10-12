import { TestBed } from '@angular/core/testing';

import { ScheduleDataService } from './schedule-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

describe('ScheduleDataService', () => {
  let service: ScheduleDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ScheduleDataService,
        { provide: ScrollService, useValue: { maxRows: 0, maxCols: 0 } },
        { provide: HolidayCollectionService, useValue: { holidays: { holidayList: [] } } },
        { provide: GridSettingsService, useValue: { weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
        { provide: DataManagementScheduleService, useValue: { 
          workFilter: { dayVisibleBeforeMonth: 0, dayVisibleAfterMonth: 0, currentYear: 2024, currentMonth: 0 },
          clients: []
        }}
      ]
    });
    service = TestBed.inject(ScheduleDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
