// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IndividualPeriodApiService } from './individual-period-api.service';
import { IndividualPeriod, Period } from 'src/app/domain/models/scheduling/individual-period.model';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('IndividualPeriodApiService', () => {
    let service: IndividualPeriodApiService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(IndividualPeriodApiService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockIndividualPeriod = (): IndividualPeriod => {
        const period = new Period();
        period.fromDate = new Date(2020, 0, 1);
        period.untilDate = new Date(2020, 5, 30);

        const individualPeriod = new IndividualPeriod();
        individualPeriod.id = 'period-123';
        individualPeriod.name = 'Test Period';
        individualPeriod.periods = [period];
        return individualPeriod;
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

                it('sends periods.fromDate/untilDate as UTC midnight without mutating the caller object on create', async () => {
                    const individualPeriod = mockIndividualPeriod();
                    const originalFromDate = individualPeriod.periods[0].fromDate;

                    const createPromise = service.create(individualPeriod);

                    const req = httpTestingController.expectOne(`${environment.baseUrl}IndividualPeriods`);
                    expect(req.request.body.periods[0].fromDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.periods[0].untilDate).toBe('2020-06-30T00:00:00.000Z');
                    expect(req.request.body.id).toBeUndefined();
                    expect(individualPeriod.periods[0].fromDate).toBe(originalFromDate);
                    req.flush(mockIndividualPeriod());
                    await createPromise;
                });

                it('sends periods.fromDate/untilDate as UTC midnight without mutating the caller object on update', async () => {
                    const individualPeriod = mockIndividualPeriod();
                    const originalFromDate = individualPeriod.periods[0].fromDate;

                    const updatePromise = service.update(individualPeriod);

                    const req = httpTestingController.expectOne(`${environment.baseUrl}IndividualPeriods`);
                    expect(req.request.body.periods[0].fromDate).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.periods[0].untilDate).toBe('2020-06-30T00:00:00.000Z');
                    expect(individualPeriod.periods[0].fromDate).toBe(originalFromDate);
                    req.flush(mockIndividualPeriod());
                    await updatePromise;
                });
            });
        }
    });
});
