// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { buildClientExportCsv } from './client-export-csv.builder';
import { IExportClientItem } from 'src/app/domain/models/client/i-export-client-item';

const HEADERS = ['No.', 'Company', 'First name', 'Last name', 'Date of birth', 'Type'];

const item = (overrides: Partial<IExportClientItem> = {}): IExportClientItem => ({
  idNumber: 7,
  company: 'Acme',
  firstName: 'Ada',
  name: 'Lovelace',
  birthdate: '2026-12-31',
  gender: 1,
  type: 2,
  legalEntity: false,
  ...overrides,
});

describe('buildClientExportCsv', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    const loader = TestBed.inject(LocaleDataLoaderService);
    await loader.ensureLoaded('de');
    await loader.ensureLoaded('en');
  });

  it('writes the supplied headers as the first line, in column order', () => {
    const [headerLine] = buildClientExportCsv([], HEADERS, 'en').split('\r\n');

    expect(headerLine).toBe(
      '﻿"No.","Company","First name","Last name","Date of birth","Type"',
    );
  });

  it('formats the birthdate in the active language', () => {
    expect(buildClientExportCsv([item()], HEADERS, 'en')).toContain('"12/31/2026"');
    expect(buildClientExportCsv([item()], HEADERS, 'de')).toContain('"31.12.2026"');
  });

  it('keeps the column order, the comma separator and the CRLF line break', () => {
    const lines = buildClientExportCsv([item()], HEADERS, 'de').split('\r\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"7","Acme","Ada","Lovelace","31.12.2026","2"');
  });

  it('leaves the birthdate cell empty when the client has none', () => {
    const lines = buildClientExportCsv([item({ birthdate: undefined })], HEADERS, 'de').split('\r\n');

    expect(lines[1]).toBe('"7","Acme","Ada","Lovelace","","2"');
  });

  it('escapes embedded quotes instead of breaking the cell', () => {
    const lines = buildClientExportCsv([item({ company: 'Ac"me' })], HEADERS, 'de').split('\r\n');

    expect(lines[1]).toContain('"Ac""me"');
  });
});
