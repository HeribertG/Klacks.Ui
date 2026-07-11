// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LanguageConfigService } from './language-config.service';
import { DataLanguageConfigService } from 'src/app/infrastructure/api/settings/data-language-config.service';
import { LanguageConfigResponse } from 'src/app/domain/models/settings/language-config';

describe('LanguageConfigService', () => {
  let service: LanguageConfigService;
  let dataService: { getLanguageConfig: ReturnType<typeof vi.fn> };

  function createResponse(overrides: Partial<LanguageConfigResponse> = {}): LanguageConfigResponse {
    return {
      supportedLanguages: ['de', 'en', 'fr', 'it'],
      fallbackOrder: ['de', 'fr', 'it', 'en'],
      metadata: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    dataService = {
      getLanguageConfig: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DataLanguageConfigService, useValue: dataService }],
    });

    service = TestBed.inject(LanguageConfigService);
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
});
