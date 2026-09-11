// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataShiftService } from './data-shift.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { Shift, IShift } from 'src/app/domain/models/shift/shift-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataShiftService', () => {
    let service: DataShiftService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                WorkTimeCalculationService
            ]
        });
        service = TestBed.inject(DataShiftService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockShift = (): Shift => {
        const shift = new Shift();
        shift.id = 'shift-123';
        shift.name = 'Test Shift';
        shift.fromDate = new Date(2020, 0, 1);
        shift.untilDate = new Date(2020, 5, 30);
        return shift;
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

                it('sends fromDate/untilDate as UTC midnight without mutating the caller object on add', () => {
                    const shift = mockShift();
                    const originalFromDate = shift.fromDate;
                    const originalUntilDate = shift.untilDate;

                    service.addShift(shift as IShift).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/`);
                    expect(req.request.body.fromDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.untilDate).toBe('2020-06-30T00:00:00.000Z');
                    expect(shift.fromDate).toBe(originalFromDate);
                    expect(shift.untilDate).toBe(originalUntilDate);
                    req.flush(mockShift());
                });

                it('sends fromDate/untilDate as UTC midnight without mutating the caller object on update', () => {
                    const shift = mockShift();
                    const originalFromDate = shift.fromDate;
                    const originalUntilDate = shift.untilDate;

                    service.updateShift(shift as IShift).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/`);
                    expect(req.request.body.fromDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.untilDate).toBe('2020-06-30T00:00:00.000Z');
                    expect(shift.fromDate).toBe(originalFromDate);
                    expect(shift.untilDate).toBe(originalUntilDate);
                    req.flush(mockShift());
                });

                it('defaults a missing fromDate to today, correctly sent as UTC midnight', () => {
                    const shift = mockShift();
                    shift.fromDate = undefined;
                    shift.untilDate = undefined;

                    service.addShift(shift as IShift).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/`);
                    expect(req.request.body.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
                    req.flush(mockShift());
                });
            });
        }
    });
});
