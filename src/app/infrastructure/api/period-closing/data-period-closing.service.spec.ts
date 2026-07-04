// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { DataPeriodClosingService } from './data-period-closing.service';
import { SealRequest } from './models/seal-request';
import { UnsealRequest } from './models/unseal-request';

describe('DataPeriodClosingService', () => {
    let service: DataPeriodClosingService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [DataPeriodClosingService],
        });
        service = TestBed.inject(DataPeriodClosingService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('POSTs to Seal endpoint', () => {
        const req: SealRequest = {
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            groupId: null,
            reason: 'Monthly close',
        };
        service.seal(req).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}PeriodClosing/Seal`);
        expect(flush.request.method).toBe('POST');
        expect(flush.request.body).toEqual(req);
        flush.flush(5);
    });

    it('POSTs to Unseal endpoint', () => {
        const req: UnsealRequest = {
            startDate: '2026-01-15',
            endDate: '2026-01-15',
            groupId: null,
            reason: 'Correction',
        };
        service.unseal(req).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}PeriodClosing/Unseal`);
        expect(flush.request.method).toBe('POST');
        flush.flush(2);
    });

    it('GETs sealed periods with query params', () => {
        service.getSealedPeriods('2026-01-01', '2026-01-31', null).subscribe();
        const flush = httpMock.expectOne((r) =>
            r.url === `${environment.baseUrl}PeriodClosing/SealedPeriods` &&
            r.params.get('from') === '2026-01-01' &&
            r.params.get('to') === '2026-01-31'
        );
        expect(flush.request.method).toBe('GET');
        flush.flush([]);
    });

    it('GETs audit log', () => {
        service.getAuditLog('2026-01-01', '2026-01-31').subscribe();
        const flush = httpMock.expectOne((r) =>
            r.url === `${environment.baseUrl}PeriodClosing/AuditLog`
        );
        flush.flush([]);
    });

    it('GETs export log', () => {
        service.getExportLog('2026-01-01', '2026-01-31').subscribe();
        const flush = httpMock.expectOne((r) =>
            r.url === `${environment.baseUrl}PeriodClosing/ExportLog`
        );
        flush.flush([]);
    });

    it('POSTs to ClientPeriodExport endpoint and requests a blob response', () => {
        const req = {
            fromDate: '2026-01-01',
            untilDate: '2026-01-31',
            language: 'de',
            currencyCode: 'EUR',
        };
        service.downloadClientPeriodExport(req).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}ClientPeriodExport`);
        expect(flush.request.method).toBe('POST');
        expect(flush.request.body).toEqual(req);
        expect(flush.request.responseType).toBe('blob');
        flush.flush(new Blob(['<xml/>']));
    });
});
