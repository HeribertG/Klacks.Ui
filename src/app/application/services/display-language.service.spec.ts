// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { DisplayLanguageService } from './display-language.service';
import { LanguageConfigService } from './language-config.service';
import { LocaleService } from './locale.service';

describe('DisplayLanguageService', () => {
  let service: DisplayLanguageService;
  let calls: string[];
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let supported: string[];

  beforeEach(() => {
    calls = [];
    supported = ['de', 'en'];
    storage = {
      get: vi.fn(),
      set: vi.fn((key: string, value: string) => calls.push(`set:${key}=${value}`)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { use: vi.fn((lang: string) => calls.push(`use:${lang}`)) } },
        { provide: LocalStorageService, useValue: storage },
        { provide: TranslateStringConstantsService, useValue: { translate: vi.fn(() => calls.push('translate')) } },
        {
          provide: LocaleService,
          useValue: { switchLocale: vi.fn((lang: string) => { calls.push(`locale:${lang}`); return Promise.resolve(); }) },
        },
        { provide: LanguageConfigService, useValue: { isLanguageSupported: (lang: string) => supported.includes(lang) } },
      ],
    });
    service = TestBed.inject(DisplayLanguageService);
  });

  it('returns the stored language only while it is supported', () => {
    storage.get.mockReturnValue('en');
    expect(service.savedSupportedLanguage()).toBe('en');
    expect(storage.get).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG);

    storage.get.mockReturnValue('xx');
    expect(service.savedSupportedLanguage()).toBeNull();

    storage.get.mockReturnValue(null);
    expect(service.savedSupportedLanguage()).toBeNull();

    storage.get.mockReturnValue('');
    expect(service.savedSupportedLanguage()).toBeNull();
  });

  it('activates, stores, re-translates and switches the locale in that order', () => {
    service.switchTo('de');

    expect(calls).toEqual(['use:de', `set:${StorageKeys.CURRENT_LANG}=de`, 'translate', 'locale:de']);
  });
});
