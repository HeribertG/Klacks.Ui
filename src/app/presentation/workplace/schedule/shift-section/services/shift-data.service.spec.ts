// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ShiftDataService } from './shift-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';
import { DataContainerShiftOverrideService } from 'src/app/infrastructure/api/container/data-container-shift-override.service';
import { IShiftSchedule, ShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import {
    activeJanuaryOffsetMinutes,
    CALENDAR_TEST_ZONES,
    expectedJanuaryOffsetMinutes,
    useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const SHIFT_NAME = 'Early';

function createShiftSchedule(wireDate: string): IShiftSchedule {
    const schedule = new ShiftSchedule();
    schedule.shiftId = 'shift-1';
    schedule.shiftName = SHIFT_NAME;
    schedule.abbreviation = 'F';
    schedule.date = wireDate as unknown as Date;
    schedule.sumEmployees = 1;
    schedule.quantity = 1;
    return schedule;
}

describe('ShiftDataService', () => {
    let service: ShiftDataService;
    let dataManagement: {
        workFilter: { currentYear: number; currentMonth: number; paymentInterval: number };
        clients: unknown[];
        shiftSchedules: IShiftSchedule[];
        visibleStartDate: Date | null;
        visibleEndDate: Date | null;
    };

    beforeEach(() => {
        dataManagement = {
            workFilter: { currentYear: 2024, currentMonth: 1, paymentInterval: 2 },
            clients: [],
            shiftSchedules: [],
            visibleStartDate: null,
            visibleEndDate: null,
        };

        TestBed.configureTestingModule({
            providers: [
                ShiftDataService,
                { provide: ScrollService, useValue: { maxRows: 0, maxCols: 0 } },
                { provide: HolidayCollectionService, useValue: { holidays: { holidayList: [] } } },
                { provide: GridSettingsService, useValue: { weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] } },
                { provide: DataManagementScheduleService, useValue: dataManagement },
                { provide: AppSettingsManagementService, useValue: {
                        workSettings: () => ({ dayVisibleBefore: 3, dayVisibleAfter: 3, paymentInterval: 2 })
                    } },
                { provide: WeekConfigurationService, useValue: {
                        isWeekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
                        getWeekendSlot: (date: Date) => date.getDay() === 6 ? 1 : date.getDay() === 0 ? 2 : null
                    } },
                { provide: WorkNotificationService, useValue: {
                        isShiftAffected: () => false
                    } },
                { provide: DataContainerShiftOverrideService, useValue: { getOverridesForRange: vi.fn() } }
            ]
        });
        service = TestBed.inject(ShiftDataService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('shift section calendar dates across browser time zones', () => {
        for (const zone of CALENDAR_TEST_ZONES) {
            describe(zone, () => {
                useTimeZone(zone);

                it('activates the configured zone', () => {
                    expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
                });

                it.each(['2026-08-03', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00'])(
                    'shows schedule.date %s in the column whose date is 2026-08-03',
                    (wireDate) => {
                        dataManagement.visibleStartDate = parseCalendarDate('2026-08-01');
                        dataManagement.visibleEndDate = parseCalendarDate('2026-08-10');
                        dataManagement.shiftSchedules = [createShiftSchedule(wireDate)];

                        service.setMetrics();

                        const column = Array.from({ length: service.columns }, (_, col) => col)
                            .find((col) => service.getDateKeyForColumn(col) === '2026-08-03');
                        expect(column).toBe(2);
                        expect(service.getItemMainText(0, 2)).toBe(SHIFT_NAME);
                        expect(service.getItemMainText(0, 1)).toBe('');
                        expect(service.getItemMainText(0, 3)).toBe('');
                    },
                );

                it('counts one column per calendar day across the autumn DST switch', () => {
                    dataManagement.visibleStartDate = parseCalendarDate('2026-10-20');
                    dataManagement.visibleEndDate = parseCalendarDate('2026-11-10');

                    service.setMetrics();

                    expect(service.columns).toBe(22);
                    expect(service.getDateKeyForColumn(21)).toBe('2026-11-10');
                });
            });
        }
    });
});
