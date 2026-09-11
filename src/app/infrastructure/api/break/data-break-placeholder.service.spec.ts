// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataBreakPlaceholderService } from './data-break-placeholder.service';
import { BreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataBreakPlaceholderService', () => {
    let service: DataBreakPlaceholderService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataBreakPlaceholderService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockBreakPlaceholder = (): BreakPlaceholder => {
        const placeholder = new BreakPlaceholder();
        placeholder.clientId = 'client-123';
        placeholder.from = new Date(2020, 0, 1);
        placeholder.until = new Date(2020, 5, 30);
        return placeholder;
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

                it('sends from/until as UTC midnight without mutating the caller object on add', () => {
                    const placeholder = mockBreakPlaceholder();
                    const originalFrom = placeholder.from;
                    const originalUntil = placeholder.until;

                    service.addBreak(placeholder).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}BreakPlaceholders/`);
                    expect(req.request.body.from).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.until).toBe('2020-06-30T00:00:00.000Z');
                    expect(placeholder.from).toBe(originalFrom);
                    expect(placeholder.until).toBe(originalUntil);
                    req.flush(mockBreakPlaceholder());
                });

                it('sends from/until as UTC midnight without mutating the caller object on update', () => {
                    const placeholder = mockBreakPlaceholder();
                    const originalFrom = placeholder.from;
                    const originalUntil = placeholder.until;

                    service.updateBreak(placeholder).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}BreakPlaceholders/`);
                    expect(req.request.body.from).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.until).toBe('2020-06-30T00:00:00.000Z');
                    expect(placeholder.from).toBe(originalFrom);
                    expect(placeholder.until).toBe(originalUntil);
                    req.flush(mockBreakPlaceholder());
                });
            });
        }
    });

    describe('unparsable from date', () => {
        it.each(['add', 'update'] as const)('reports the error through the observable on %s instead of throwing', (operation) => {
            const placeholder = mockBreakPlaceholder();
            placeholder.from = new Date('invalid');
            const onError = vi.fn();

            const call = () => (operation === 'add' ? service.addBreak(placeholder) : service.updateBreak(placeholder));

            expect(call).not.toThrow();
            call().subscribe({ error: onError });
            expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
            httpTestingController.expectNone(`${environment.baseUrl}BreakPlaceholders/`);
        });
    });
});
