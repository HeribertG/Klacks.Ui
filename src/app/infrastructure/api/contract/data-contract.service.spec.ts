// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataContractService } from './data-contract.service';
import { Contract } from 'src/app/domain/models/contract/contract-class';
import { environment } from 'src/environments/environment';
import { currentTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataContractService', () => {
    let service: DataContractService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataContractService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    const mockContract = (): Contract => {
        const contract = new Contract();
        contract.id = 'contract-123';
        contract.name = 'Test Contract';
        contract.validFrom = new Date(2020, 0, 1);
        contract.validUntil = new Date(2020, 5, 30);
        return contract;
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
                    const contract = mockContract();
                    const originalValidFrom = contract.validFrom;
                    const originalValidUntil = contract.validUntil;

                    service.addContract(contract).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Contracts/`);
                    expect(req.request.body.validFrom).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2020-06-30T00:00:00.000Z');
                    expect(contract.validFrom).toBe(originalValidFrom);
                    expect(contract.validUntil).toBe(originalValidUntil);
                    req.flush(mockContract());
                });

                it('sends validFrom/validUntil as UTC midnight without mutating the caller object on update', () => {
                    const contract = mockContract();
                    const originalValidFrom = contract.validFrom;
                    const originalValidUntil = contract.validUntil;

                    service.updateContract(contract).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Contracts/`);
                    expect(req.request.body.validFrom).toBe('2020-01-01T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2020-06-30T00:00:00.000Z');
                    expect(contract.validFrom).toBe(originalValidFrom);
                    expect(contract.validUntil).toBe(originalValidUntil);
                    req.flush(mockContract());
                });

                it('omits validUntil on the wire when the contract has none', () => {
                    const contract = mockContract();
                    contract.validUntil = undefined;

                    service.addContract(contract).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Contracts/`);
                    expect(req.request.body.validUntil).toBeUndefined();
                    req.flush(mockContract());
                });

                it('sends UTC-midnight strings loaded from the backend on their own day', () => {
                    const contract = mockContract();
                    contract.validFrom = '2026-08-03T00:00:00Z' as unknown as Date;
                    contract.validUntil = '2026-12-31T00:00:00Z' as unknown as Date;

                    service.updateContract(contract).subscribe();

                    const req = httpTestingController.expectOne(`${environment.baseUrl}Contracts/`);
                    expect(req.request.body.validFrom).toBe('2026-08-03T00:00:00.000Z');
                    expect(req.request.body.validUntil).toBe('2026-12-31T00:00:00.000Z');
                    req.flush(mockContract());
                });
            });
        }
    });

    describe('unparsable validFrom', () => {
        it.each(['add', 'update'] as const)('reports the error through the observable on %s instead of throwing', (operation) => {
            const contract = mockContract();
            contract.validFrom = new Date('invalid');
            const onError = vi.fn();

            const call = () => (operation === 'add' ? service.addContract(contract) : service.updateContract(contract));

            expect(call).not.toThrow();
            call().subscribe({ error: onError });
            expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
            httpTestingController.expectNone(`${environment.baseUrl}Contracts/`);
        });
    });
});
