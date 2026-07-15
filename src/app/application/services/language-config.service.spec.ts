// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LanguageConfigService } from './language-config.service';
import { DataLanguageConfigService } from 'src/app/infrastructure/api/settings/data-language-config.service';
import { LanguageConfigResponse } from 'src/app/domain/models/settings/language-config';

function mockNavigatorLanguage(value: string) {
  Object.defineProperty(navigator, 'language', { get: () => value, configurable: true });
  Object.defineProperty(navigator, 'languages', { get: () => (value ? [value] : []), configurable: true });
}

describe('LanguageConfigService', () => {
  let service: LanguageConfigService;
  let dataService: { getLanguageConfig: ReturnType<typeof vi.fn> };
  let originalLanguageGetter: PropertyDescriptor | undefined;
  let originalLanguagesGetter: PropertyDescriptor | undefined;

  function createResponse(overrides: Partial<LanguageConfigResponse> = {}): LanguageConfigResponse {
    return {
      supportedLanguages: ['de', 'en', 'fr', 'it'],
      fallbackOrder: ['de', 'fr', 'it', 'en'],
      metadata: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    originalLanguageGetter = Object.getOwnPropertyDescriptor(navigator, 'language');
    originalLanguagesGetter = Object.getOwnPropertyDescriptor(navigator, 'languages');

    dataService = {
      getLanguageConfig: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DataLanguageConfigService, useValue: dataService }],
    });

    service = TestBed.inject(LanguageConfigService);
  });

  afterEach(() => {
    if (originalLanguageGetter) {
      Object.defineProperty(navigator, 'language', originalLanguageGetter);
    }
    if (originalLanguagesGetter) {
      Object.defineProperty(navigator, 'languages', originalLanguagesGetter);
    }
  });

  describe('getDefaultLanguage', () => {
    it('should return the fallback default language before the config is loaded', () => {
      expect(service.getDefaultLanguage()).toBe(LanguageConfigService.FALLBACK_DEFAULT_LANGUAGE);
      expect(service.getDefaultLanguage()).toBe('en');
    });

    it('should return the backend default language after loading', async () => {
      dataService.getLanguageConfig.mockReturnValue(of(createResponse({ defaultLanguage: 'fr' })));

      await service.loadConfig();

      expect(service.getDefaultLanguage()).toBe('fr');
      expect(service.defaultLanguage$()).toBe('fr');
    });

    it('should fall back to en when the backend response has no default language', async () => {
      dataService.getLanguageConfig.mockReturnValue(of(createResponse()));

      await service.loadConfig();

      expect(service.getDefaultLanguage()).toBe('en');
    });

    it('should fall back to en when the backend response has an empty default language', async () => {
      dataService.getLanguageConfig.mockReturnValue(of(createResponse({ defaultLanguage: '' })));

      await service.loadConfig();

      expect(service.getDefaultLanguage()).toBe('en');
    });

    it('should keep the fallback default language when the config request fails', async () => {
      dataService.getLanguageConfig.mockReturnValue(throwError(() => new Error('network error')));

      await service.loadConfig();

      expect(service.getDefaultLanguage()).toBe('en');
      expect(service.loaded$()).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should apply supported languages and fallback order from the backend', async () => {
      dataService.getLanguageConfig.mockReturnValue(
        of(createResponse({ supportedLanguages: ['en', 'ar'], fallbackOrder: ['en', 'ar'], defaultLanguage: 'ar' }))
      );

      await service.loadConfig();

      expect(service.getSupportedLanguages()).toEqual(['en', 'ar']);
      expect(service.getFallbackOrder()).toEqual(['en', 'ar']);
      expect(service.getDefaultLanguage()).toBe('ar');
      expect(service.loaded$()).toBe(true);
    });
  });

  describe('resolveInitialLanguage', () => {
    it('should return the saved language when it is supported', () => {
      mockNavigatorLanguage('fr-FR');

      expect(service.resolveInitialLanguage('it')).toBe('it');
    });

    it('should ignore an unsupported saved language and fall back to the browser language', () => {
      mockNavigatorLanguage('fr-FR');

      expect(service.resolveInitialLanguage('xx')).toBe('fr');
    });

    it('should use the browser language when nothing is saved', () => {
      mockNavigatorLanguage('it-IT');

      expect(service.resolveInitialLanguage(null)).toBe('it');
    });

    it('should fall back to the installation default when the browser language is not supported', () => {
      mockNavigatorLanguage('th-TH');

      expect(service.resolveInitialLanguage(null)).toBe(service.getDefaultLanguage());
    });
  });
});
