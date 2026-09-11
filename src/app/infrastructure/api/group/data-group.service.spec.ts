// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataGroupService } from './data-group.service';
import { Group, IGroup } from 'src/app/domain/models/group/group-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataGroupService', () => {
    let service: DataGroupService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataGroupService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockGroup = (): Group => {
        const group = new Group();
        group.id = 'group-123';
        group.name = 'Test Group';
        group.validFrom = new Date(2020, 0, 1);
        group.validUntil = new Date(2020, 5, 30);
        return group;
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

                it('sends validFrom/validUntil as UTC midnight without mutating the caller object on add', () => {
                    const group = mockGroup();
                    const originalValidFrom = group.validFrom;
                    const originalValidUntil = group.validUntil;

                    service.addGroup(group as IGroup).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Groups/`);
                    expect(req.request.body.validFrom).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2020-06-30T00:00:00.000Z');
                    expect(group.validFrom).toBe(originalValidFrom);
                    expect(group.validUntil).toBe(originalValidUntil);
                    req.flush(mockGroup());
                });

                it('sends validFrom/validUntil as UTC midnight without mutating the caller object on update', () => {
                    const group = mockGroup();
                    const originalValidFrom = group.validFrom;
                    const originalValidUntil = group.validUntil;

                    service.updateGroup(group as IGroup).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Groups/`);
                    expect(req.request.body.validFrom).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2020-06-30T00:00:00.000Z');
                    expect(group.validFrom).toBe(originalValidFrom);
                    expect(group.validUntil).toBe(originalValidUntil);
                    req.flush(mockGroup());
                });

                it('sends UTC-midnight strings loaded from the backend on their own day', () => {
                    const group = mockGroup();
                    group.validFrom = '2026-08-03T00:00:00Z' as unknown as Date;
                    group.validUntil = '2026-12-31T00:00:00Z' as unknown as Date;

                    service.updateGroup(group as IGroup).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Groups/`);
                    expect(req.request.body.validFrom).toBe('2026-08-03T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2026-12-31T00:00:00.000Z');
                    req.flush(mockGroup());
                });
            });
        }
    });

    describe('unparsable validFrom', () => {
        it.each(['add', 'update'] as const)('reports the error through the observable on %s instead of throwing', (operation) => {
            const group = mockGroup();
            group.validFrom = new Date('invalid');
            const onError = vi.fn();

            const call = () => (operation === 'add' ? service.addGroup(group as IGroup) : service.updateGroup(group as IGroup));

            expect(call).not.toThrow();
            call().subscribe({ error: onError });
            expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
            httpTestingController.expectNone(`${environment.baseUrl}Groups/`);
        });
    });
});
