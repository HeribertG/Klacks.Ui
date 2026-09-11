// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataShiftCutsService } from './data-shift-cuts.service';
import { WorkTimeCalculationService } from 'src/app/domain/services/work-time-calculation.service';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { CutOperation } from 'src/app/domain/models/shift/cut-operation';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataShiftCutsService', () => {
    let service: DataShiftCutsService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                WorkTimeCalculationService
            ]
        });
        service = TestBed.inject(DataShiftCutsService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockCutOperation = (): CutOperation => {
        const shift = new Shift();
        shift.id = 'shift-123';
        shift.fromDate = new Date(2020, 0, 1);
        shift.untilDate = new Date(2020, 5, 30);
        return { type: 'UPDATE', parentId: 'shift-original', data: shift };
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

                it('sends fromDate/untilDate as UTC midnight without mutating the caller object', () => {
                    const operation = mockCutOperation();
                    const originalFromDate = operation.data.fromDate;
                    const originalUntilDate = operation.data.untilDate;

                    service.batchCuts([operation]).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/Cuts/Batch`);
                    const sentData = req.request.body.operations[0].data;
                    expect((sentData.fromDate as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
                    expect((sentData.untilDate as Date).toISOString()).toBe('2020-06-30T00:00:00.000Z');
                    expect(operation.data.fromDate).toBe(originalFromDate);
                    expect(operation.data.untilDate).toBe(originalUntilDate);
                    req.flush([]);
                });

                it('sends DateOnly strings loaded from the backend as the same calendar day', () => {
                    const operation = mockCutOperation();
                    operation.data.fromDate = '2026-08-03' as unknown as Date;
                    operation.data.untilDate = '2026-08-31T00:00:00Z' as unknown as Date;

                    service.batchCuts([operation]).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/Cuts/Batch`);
                    const sentData = req.request.body.operations[0].data;
                    expect((sentData.fromDate as Date).toISOString()).toBe('2026-08-03T00:00:00.000Z');
                    expect((sentData.untilDate as Date).toISOString()).toBe('2026-08-31T00:00:00.000Z');
                    req.flush([]);
                });

                it('sends the reset start date as UTC midnight of its local calendar day', () => {
                    service.resetCuts('shift-original', new Date(2026, 7, 3)).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Shifts/Cuts/Reset`);
                    expect(req.request.body).toEqual({
                        originalId: 'shift-original',
                        newStartDate: '2026-08-03T00:00:00.000Z',
                    });
                    req.flush([]);
                });
            });
        }
    });
});
