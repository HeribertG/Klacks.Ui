// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { ExportFormatCatalogService } from './export-format-catalog.service';

const format = (key: string, family: string, enabled: boolean, fixed = false): ExportFormatResource => ({
  key,
  family,
  enabled,
  fixed,
  brand: '',
});

describe('ExportFormatCatalogService', () => {
  let getFormats: ReturnType<typeof vi.fn>;
  let service: ExportFormatCatalogService;

  beforeEach(() => {
    getFormats = vi.fn();
    TestBed.configureTestingModule({
      providers: [ExportFormatCatalogService, { provide: DataExportFormatsService, useValue: { getFormats } }],
    });
    service = TestBed.inject(ExportFormatCatalogService);
  });

  it('offers only enabled order formats as order choices, with their label key', async () => {
    getFormats.mockReturnValue(
      of([format('xml', 'order', true, true), format('csv', 'order', false), format('datev', 'payroll', true)])
    );

    const catalog = await firstValueFrom(service.loadCatalog());

    expect(catalog.orderFormats).toEqual([{ key: 'xml', labelKey: 'periodClosing.format.xml' }]);
  });

  it('lists fixed formats first, then enabled payroll formats, and marks only the payroll keys', async () => {
    getFormats.mockReturnValue(
      of([
        format('datev', 'payroll', true),
        format('json', 'order', true, true),
        format('bmd', 'payroll', false),
        format('xml', 'clientperiod', false, true),
      ])
    );

    const catalog = await firstValueFrom(service.loadCatalog());

    expect(catalog.employeeFormats.map((f) => f.key)).toEqual(['json', 'xml', 'datev']);
    expect([...catalog.payrollFormatKeys]).toEqual(['datev']);
  });

  it('propagates a failed read', async () => {
    getFormats.mockReturnValue(throwError(() => new Error('offline')));

    await expect(firstValueFrom(service.loadCatalog())).rejects.toThrow('offline');
  });
});
