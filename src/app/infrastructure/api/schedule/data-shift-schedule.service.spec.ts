// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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

    describe('getShiftSchedulePartial', () => {
        const partialUrl = `${environment.baseUrl}Shifts/Schedule/Partial`;

        it('posts the shift/date pairs with calendar dates as UTC midnight', () => {
            service
                .getShiftSchedulePartial({
                    shiftDatePairs: [{ shiftId: 'shift-1', date: new Date(2026, 9, 5) }],
                    analyseToken: 'token-1',
                })
                .subscribe();

            const req = httpTestingController.expectOne(partialUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                shiftDatePairs: [{ shiftId: 'shift-1', date: '2026-10-05T00:00:00.000Z' }],
                analyseToken: 'token-1',
            });
            req.flush({ shifts: [], totalCount: 0 });
        });

        it('does not retry a rejected request', () => {
            const onError = vi.fn();
            service.getShiftSchedulePartial({ shiftDatePairs: [] }).subscribe({ error: onError });

            httpTestingController.expectOne(partialUrl).flush(null, { status: 400, statusText: 'Bad Request' });

            expect(onError).toHaveBeenCalledTimes(1);
            httpTestingController.expectNone(partialUrl);
        });
    });

    describe('unparsable holidayDates', () => {
        it('reports the error through the observable instead of throwing', () => {
            const filter = mockFilter();
            filter.holidayDates = [new Date('invalid')];
            const onError = vi.fn();

            const call = () => service.getShiftSchedule(filter);

            expect(call).not.toThrow();
            call().subscribe({ error: onError });
            expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
            httpTestingController.expectNone(`${environment.baseUrl}Shifts/Schedule`);
        });
    });
});
