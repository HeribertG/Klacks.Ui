// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataBreakService } from './data-break.service';
import { Break } from 'src/app/domain/models/break/break-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataBreakService', () => {
    let service: DataBreakService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataBreakService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockBreak = (): Break => {
        const breakEntry = new Break();
        breakEntry.clientId = 'client-123';
        breakEntry.currentDate = new Date(2020, 0, 1);
        return breakEntry;
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

                it('sends currentDate as UTC midnight without mutating the caller object on add', () => {
                    const breakEntry = mockBreak();
                    const originalDate = breakEntry.currentDate;

                    service.addBreak(breakEntry).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Breaks/`);
                    expect(req.request.body.currentDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(breakEntry.currentDate).toBe(originalDate);
                    req.flush(mockBreak());
                });

                it('sends currentDate as UTC midnight without mutating the caller object on update', () => {
                    const breakEntry = mockBreak();
                    const originalDate = breakEntry.currentDate;

                    service.updateBreak(breakEntry).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Breaks/`);
                    expect(req.request.body.currentDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(breakEntry.currentDate).toBe(originalDate);
                    req.flush(mockBreak());
                });

                it('sends a DateOnly currentDate loaded from the backend instead of failing', () => {
                    const breakEntry = mockBreak();
                    breakEntry.currentDate = '2026-08-03' as unknown as Date;

                    service.updateBreak(breakEntry).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Breaks/`);
                    expect(req.request.body.currentDate).toBe('2026-08-03T00:00:00.000Z');
                    req.flush(mockBreak());
                });
            });
        }
    });

    describe('unparsable currentDate', () => {
        it.each(['add', 'update'] as const)('reports the error through the observable on %s instead of throwing', (operation) => {
            const breakEntry = mockBreak();
            breakEntry.currentDate = new Date('invalid');
            const onError = vi.fn();

            const call = () => (operation === 'add' ? service.addBreak(breakEntry) : service.updateBreak(breakEntry));

            expect(call).not.toThrow();
            call().subscribe({ error: onError });
            expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
            httpTestingController.expectNone(`${environment.baseUrl}Breaks/`);
        });
    });
});
