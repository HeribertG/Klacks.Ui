import { TestBed } from '@angular/core/testing';

import { ShiftDataService } from './shift-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

describe('ShiftDataService', () => {
    let service: ShiftDataService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ShiftDataService,
                { provide: ScrollService, useValue: { maxRows: 0, maxCols: 0 } },
                { provide: HolidayCollectionService, useValue: { holidays: { holidayList: [] } } },
                { provide: GridSettingsService, useValue: { weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
                { provide: DataManagementScheduleService, useValue: {
                        workFilter: { dayVisibleBeforeMonth: 0, dayVisibleAfterMonth: 0, currentYear: 2024, currentMonth: 0 },
                        clients: []
                    } }
            ]
        });
        service = TestBed.inject(ShiftDataService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
