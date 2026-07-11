// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
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
  let languageConfigService: { getDefaultLanguage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorageService = {
      get: vi.fn(),
      set: vi.fn(),
    };
    languageConfigService = {
      getDefaultLanguage: vi.fn().mockReturnValue('fr'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: LanguageConfigService, useValue: languageConfigService },
        { provide: DataLoadFileService, useValue: {} },
        { provide: DataSettingsVariousService, useValue: {} },
        { provide: DataManagementAssistantService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
      ],
    });

    service = TestBed.inject(ApplicationInitService);
  });

  describe('initializeBasics', () => {
    it('should keep the stored user language choice untouched', () => {
      localStorageService.get.mockReturnValue('it');

      service.initializeBasics();

      expect(localStorageService.set).not.toHaveBeenCalled();
    });

    it('should seed the backend default language when no user choice is stored', () => {
      localStorageService.get.mockReturnValue(null);

      service.initializeBasics();

      expect(localStorageService.set).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG, 'fr');
    });

    it('should seed the client fallback language when the backend value is unavailable', () => {
      localStorageService.get.mockReturnValue(null);
      languageConfigService.getDefaultLanguage.mockReturnValue(LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);

      service.initializeBasics();

      expect(localStorageService.set).toHaveBeenCalledWith(StorageKeys.CURRENT_LANG, 'en');
    });
  });
});
