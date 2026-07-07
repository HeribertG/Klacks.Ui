// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { ShiftDataService } from './shift-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';

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
                        workFilter: { currentYear: 2024, currentMonth: 1, paymentInterval: 2 },
                        clients: [],
                        shiftSchedules: [],
                        visibleStartDate: null,
                        visibleEndDate: null
                    } },
                { provide: AppSettingsManagementService, useValue: {
                        workSettings: () => ({ dayVisibleBefore: 3, dayVisibleAfter: 3, paymentInterval: 2 })
                    } },
                { provide: WeekConfigurationService, useValue: {
                        isWeekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
                        getWeekendSlot: (date: Date) => date.getDay() === 6 ? 1 : date.getDay() === 0 ? 2 : null
                    } },
                { provide: WorkNotificationService, useValue: {
                        isShiftAffected: () => false
                    } }
            ]
        });
        service = TestBed.inject(ShiftDataService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
