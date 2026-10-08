// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
            format: 'xml',
        };
        service.downloadClientPeriodExport(req).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}ClientPeriodExport`);
        expect(flush.request.method).toBe('POST');
        expect(flush.request.body).toEqual(req);
        expect(flush.request.responseType).toBe('blob');
        flush.flush(new Blob(['<xml/>']));
    });

    it('POSTs to PayrollExport endpoint without a group and requests a blob response', () => {
        const req = {
            fromDate: '2026-01-01',
            untilDate: '2026-01-31',
            language: 'de',
            format: 'datev-lug-bewegungsdaten',
        };
        service.downloadPayrollExport(req).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}PayrollExport`);
        expect(flush.request.method).toBe('POST');
        expect(flush.request.body).toEqual(req);
        expect('groupId' in flush.request.body).toBe(false);
        expect(flush.request.responseType).toBe('blob');
        flush.flush(new Blob(['data']));
    });

    it('POSTs the person selection of a supplementary payroll export', () => {
        const clientIds = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];
        service.downloadPayrollExport({
            fromDate: '2026-01-01',
            untilDate: '2026-01-31',
            language: 'de',
            format: 'datev-lug-bewegungsdaten',
            clientIds,
        }).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}PayrollExport`);
        expect(flush.request.body.clientIds).toEqual(clientIds);
        flush.flush(new Blob(['data']));
    });

    it('GETs the payroll export preview with the period and format', () => {
        service.getPayrollExportPreview('2026-01-01', '2026-01-31', 'datev-lug-bewegungsdaten').subscribe();
        const flush = httpMock.expectOne((r) => r.url === `${environment.baseUrl}PayrollExport/Preview`);
        expect(flush.request.method).toBe('GET');
        expect(flush.request.params.get('fromDate')).toBe('2026-01-01');
        expect(flush.request.params.get('untilDate')).toBe('2026-01-31');
        expect(flush.request.params.get('format')).toBe('datev-lug-bewegungsdaten');
        expect(flush.request.params.has('clientIds')).toBe(false);
        flush.flush({ canExport: false, isComplete: true, personCount: 0, newOrChangedPersons: [], alreadyExportedCount: 0, blockers: [], blockerTotal: 0 });
    });

    it('GETs the payroll export preview scoped to a person selection', () => {
        service.getPayrollExportPreview('2026-01-01', '2026-01-31', 'paxml-se', ['a', 'b']).subscribe();
        const flush = httpMock.expectOne((r) => r.url === `${environment.baseUrl}PayrollExport/Preview`);
        expect(flush.request.params.getAll('clientIds')).toEqual(['a', 'b']);
        flush.flush({});
    });

    it('GETs a stored payroll export for re-download as a blob', () => {
        const id = '33333333-3333-3333-3333-333333333333';
        service.downloadStoredPayrollExport(id).subscribe();
        const flush = httpMock.expectOne(`${environment.baseUrl}PayrollExport/${id}/download`);
        expect(flush.request.method).toBe('GET');
        expect(flush.request.responseType).toBe('blob');
        flush.flush(new Blob(['data']));
    });
});
