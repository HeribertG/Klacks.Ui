// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CLIENT_EXPORT_COLUMN_KEYS } from 'src/app/domain/constants/client-export.constants';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { Filter } from 'src/app/domain/models/client/client-class';
import { IExportClientItem } from 'src/app/domain/models/client/i-export-client-item';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { ClientListService } from './client-list.service';

const EXPORT_ITEM: IExportClientItem = {
  idNumber: 7,
  company: 'Acme',
  firstName: 'Ada',
  name: 'Lovelace',
  birthdate: '2026-12-31',
  gender: 1,
  type: 2,
  legalEntity: false,
};

const OBJECT_URL = 'blob:client-export';

class MockEventBus implements IEventBus {
  emit<_T>(_eventType: string, _payload: _T): void {}
  on<_T>(_eventType: string) {
    return of();
  }
  onAny() {
    return of();
  }
}

let savedCsv = '';

class CapturingBlob extends Blob {
  constructor(parts: string[], options?: BlobPropertyBag) {
    super(parts, options);
    savedCsv = parts.join('');
  }
}

describe('ClientListService CSV export', () => {
  let service: ClientListService;

  beforeEach(async () => {
    savedCsv = '';
    vi.stubGlobal('Blob', CapturingBlob);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(OBJECT_URL);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        ClientListService,
        { provide: EVENT_BUS_TOKEN, useValue: new MockEventBus() },
        {
          provide: DataClientService,
          useValue: { exportList: () => of([EXPORT_ITEM]) },
        },
      ],
    });

    const loader = TestBed.inject(LocaleDataLoaderService);
    await loader.ensureLoaded('de');
    await loader.ensureLoaded('en');
    service = TestBed.inject(ClientListService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('takes every column caption from a translation key instead of a German literal', () => {
    const translateService = TestBed.inject(TranslateService);
    const instant = vi.spyOn(translateService, 'instant').mockImplementation((key) => `T(${key})`);

    service.exportExcel(new Filter());

    CLIENT_EXPORT_COLUMN_KEYS.forEach((key) => expect(instant).toHaveBeenCalledWith(key));
    expect(savedCsv).toContain(`"T(${CLIENT_EXPORT_COLUMN_KEYS[0]})"`);
  });

  it('formats the birthdate in the active language', () => {
    const localeService = TestBed.inject(LocaleService);

    localeService.setLocale('en');
    service.exportExcel(new Filter());
    expect(savedCsv).toContain('"12/31/2026"');

    localeService.setLocale('de');
    service.exportExcel(new Filter());
    expect(savedCsv).toContain('"31.12.2026"');
  });
});
