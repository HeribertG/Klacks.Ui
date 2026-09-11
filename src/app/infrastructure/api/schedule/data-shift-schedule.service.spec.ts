// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataShiftScheduleService } from './data-shift-schedule.service';
import { ShiftScheduleFilter } from 'src/app/domain/models/schedule/shift-schedule-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataShiftScheduleService', () => {
    let service: DataShiftScheduleService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataShiftScheduleService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockFilter = (): ShiftScheduleFilter => {
        const filter = new ShiftScheduleFilter();
        filter.startDate = '2020-01-01';
        filter.endDate = '2020-01-31';
        filter.holidayDates = [new Date(2020, 0, 1), new Date(2020, 0, 6)];
        return filter;
    };

    describe('calendar date wire format', () => {
        const ZONES = ['Asia/Kolkata', 'America/New_York'] as const;

        for (const zone of ZONES) {
            describe(zone, () => {
                let originalTz: string | undefined;

                beforeEach(() => {
                    originalTz = currentTimeZone();
                    process.env['TZ'] = zone;
                });

                afterEach(() => {
                    process.env['TZ'] = originalTz;
                });

                it('sends holidayDates as UTC midnight without mutating the caller object', () => {
                    const filter = mockFilter();
                    const originalHolidayDates = filter.holidayDates;

                    service.getShiftSchedule(filter).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/Schedule`);
                    expect(req.request.body.holidayDates).toEqual([
                        '2020-01-01T00:00:00.000Z',
                        '2020-01-06T00:00:00.000Z',
                    ]);
                    expect(filter.holidayDates).toBe(originalHolidayDates);
                    req.flush({ shifts: [], totalCount: 0 });
                });
            });
        }
    });
});
