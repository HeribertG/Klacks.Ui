// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from './locale.service';
import { ApplicationInitService } from './application-init.service';
import { LanguageConfigService } from './language-config.service';
import { AuthorizationService } from './authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

describe('ApplicationInitService', () => {
  let service: ApplicationInitService;
  let localStorageService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let languageConfigService: {
    getDefaultLanguage: ReturnType<typeof vi.fn>;
    resolveInitialLanguage: ReturnType<typeof vi.fn>;
  };
  let translateService: { setDefaultLang: ReturnType<typeof vi.fn>; use: ReturnType<typeof vi.fn> };
  let localeService: { switchLocale: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorageService = {
      get: vi.fn(),
      set: vi.fn(),
    };
    languageConfigService = {
      getDefaultLanguage: vi.fn().mockReturnValue('fr'),
      resolveInitialLanguage: vi.fn((saved: string | null) => saved ?? 'fr'),
    };
    translateService = {
      setDefaultLang: vi.fn(),
      use: vi.fn(),
    };
    localeService = {
      switchLocale: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: LanguageConfigService, useValue: languageConfigService },
        { provide: TranslateService, useValue: translateService },
        { provide: LocaleService, useValue: localeService },
        { provide: DataLoadFileService, useValue: {} },
        { provide: DataSettingsVariousService, useValue: {} },
        { provide: DataManagementAssistantService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
      ],
    });

    service = TestBed.inject(ApplicationInitService);
  });

  describe('initializeBasics - language persistence', () => {
    it('should keep the stored user language choice untouched', () => {
      localStorageService.get.mockReturnValue('it');

      service.initializeBasics();

      expect(localStorageService.set).not.toHaveBeenCalled();
    });

    it('should keep an unsupported stored value untouched and activate the resolved language', () => {
      localStorageService.get.mockReturnValue('xx');
      languageConfigService.resolveInitialLanguage.mockReturnValue('pl');

      service.initializeBasics();

      expect(localStorageService.set).not.toHaveBeenCalled();
      expect(translateService.use).toHaveBeenCalledWith('pl');
    });

    it('should seed the backend default language when no user choice is stored and nothing else matches', () => {
      localStorageService.get.mockReturnValue(null);

      service.initializeBasics();

      expect(localStorageService.set).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG, 'fr');
    });

    it('should seed the client fallback language when the backend value is unavailable', () => {
      localStorageService.get.mockReturnValue(null);
      languageConfigService.getDefaultLanguage.mockReturnValue(LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);
      languageConfigService.resolveInitialLanguage.mockReturnValue(LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);

      service.initializeBasics();

      expect(localStorageService.set).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG, 'en');
    });

    it('should seed the supported browser language of a first-time visitor instead of the installation default', () => {
      localStorageService.get.mockReturnValue(null);
      languageConfigService.resolveInitialLanguage.mockReturnValue('pl');

      service.initializeBasics();

      expect(languageConfigService.resolveInitialLanguage).toHaveBeenCalledWith(null);
      expect(localStorageService.set).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG, 'pl');
    });
  });

  describe('initializeBasics - UI language for every route', () => {
    it('should set the backend default language as translation fallback', () => {
      localStorageService.get.mockReturnValue('it');

      service.initializeBasics();

      expect(translateService.setDefaultLang).toHaveBeenCalledWith('fr');
    });

    it('should activate the stored user language so that legal pages opened directly are translated', () => {
      localStorageService.get.mockReturnValue('it');

      service.initializeBasics();

      expect(languageConfigService.resolveInitialLanguage).toHaveBeenCalledWith('it');
      expect(translateService.use).toHaveBeenCalledWith('it');
    });

    it('should activate the same language that is persisted for a first-time visitor', () => {
      localStorageService.get.mockReturnValue(null);
      languageConfigService.resolveInitialLanguage.mockReturnValue('pl');

      service.initializeBasics();

      expect(translateService.use).toHaveBeenCalledWith('pl');
    });

    it('should switch the locale to the activated language so that direction and document language follow it', () => {
      localStorageService.get.mockReturnValue('it');

      service.initializeBasics();

      expect(localeService.switchLocale).toHaveBeenCalledWith('it');
    });
  });
});
