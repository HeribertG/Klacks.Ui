import { TestBed } from '@angular/core/testing';
import { FormStyle, TranslationWidth, getLocaleDayNames } from '@angular/common';

import { LocaleService } from './locale.service';
import { LocaleDataLoaderService } from './locale-data-loader.service';

describe('LocaleService', () => {
  let service: LocaleService;
  let originalLanguageGetter: PropertyDescriptor | undefined;
  let originalLanguagesGetter: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalLanguageGetter = Object.getOwnPropertyDescriptor(navigator, 'language');
    originalLanguagesGetter = Object.getOwnPropertyDescriptor(navigator, 'languages');
  });

  afterEach(() => {
    if (originalLanguageGetter) {
      Object.defineProperty(navigator, 'language', originalLanguageGetter);
    }
    if (originalLanguagesGetter) {
      Object.defineProperty(navigator, 'languages', originalLanguagesGetter);
    }
  });

  function mockNavigatorLanguage(value: string) {
    Object.defineProperty(navigator, 'language', { get: () => value, configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => value ? [value] : [], configurable: true });
  }

  function createService(): LocaleService {
    TestBed.configureTestingModule({});
    return TestBed.inject(LocaleService);
  }

  describe('detectBrowserLanguage', () => {
    it('should return base language from navigator.language', () => {
      mockNavigatorLanguage('en-US');
      const result = LocaleService.detectBrowserLanguage();
      expect(result).toBe('en');
    });

    it('should return lowercase language code', () => {
      mockNavigatorLanguage('DE-AT');
      const result = LocaleService.detectBrowserLanguage();
      expect(result).toBe('de');
    });

    it('should fall back to en when navigator.language is empty', () => {
      mockNavigatorLanguage('');
      const result = LocaleService.detectBrowserLanguage();
      expect(result).toBe('en');
    });

    it('should map a regional variant to its supported base language', () => {
      mockNavigatorLanguage('es-MX');
      expect(LocaleService.detectBrowserLanguage()).toBe('es');
    });

    it('should keep the region for supported regional languages', () => {
      mockNavigatorLanguage('zh-TW');
      expect(LocaleService.detectBrowserLanguage()).toBe('zh-TW');
    });

    it('should resolve a script subtag to the supported regional language', () => {
      mockNavigatorLanguage('zh-Hant-TW');
      expect(LocaleService.detectBrowserLanguage()).toBe('zh-TW');
    });

    it('should resolve a bare script subtag to the supported regional language', () => {
      mockNavigatorLanguage('zh-Hans');
      expect(LocaleService.detectBrowserLanguage()).toBe('zh-CN');
    });

    it('should fall back to the default language for unsupported languages', () => {
      mockNavigatorLanguage('xx');
      expect(LocaleService.detectBrowserLanguage()).toBe('en');
    });

    it('should map a bare chinese tag to the simplified variant', () => {
      mockNavigatorLanguage('zh');
      expect(LocaleService.detectBrowserLanguage()).toBe('zh-CN');
    });

    it('should report null from matchSupportedLanguage for unsupported languages', () => {
      expect(LocaleService.matchSupportedLanguage('xx-YY')).toBeNull();
      expect(LocaleService.matchSupportedLanguage('es-MX')).toBe('es');
    });
  });

  describe('setLocale', () => {
    it('should update the locale signal', () => {
      mockNavigatorLanguage('en-US');
      service = createService();

      service.setLocale('fr');
      expect(service.locale()).toBe('fr');
    });
  });

  describe('getLocale', () => {
    it('should return the current locale', () => {
      mockNavigatorLanguage('en-US');
      service = createService();

      service.setLocale('de');
      expect(service.getLocale()).toBe('de');
    });
  });

  describe('initial locale', () => {
    it('should be set from browser language', () => {
      mockNavigatorLanguage('ar-SA');
      service = createService();

      expect(service.getLocale()).toBe('ar');
    });
  });
  describe('switchLocale', () => {
    it('should load locale data before switching the signal', async () => {
      mockNavigatorLanguage('en-US');
      service = createService();

      await service.switchLocale('th');

      expect(service.getLocale()).toBe('th');
      expect(() => getLocaleDayNames('th', FormStyle.Standalone, TranslationWidth.Abbreviated)).not.toThrow();
    });

    it('should keep the previous locale when the locale data fails to load', async () => {
      mockNavigatorLanguage('en-US');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: LocaleDataLoaderService,
            useValue: { ensureLoaded: () => Promise.reject(new Error('chunk load failed')) },
          },
        ],
      });
      service = TestBed.inject(LocaleService);

      await service.switchLocale('th');

      expect(service.getLocale()).toBe('en');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should still switch to an eagerly registered core language when loading fails', async () => {
      mockNavigatorLanguage('en-US');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: LocaleDataLoaderService,
            useValue: { ensureLoaded: () => Promise.reject(new Error('chunk load failed')) },
          },
        ],
      });
      service = TestBed.inject(LocaleService);

      await service.switchLocale('de');

      expect(service.getLocale()).toBe('de');
      errorSpy.mockRestore();
    });

    it('should normalize an unsupported language to the default', async () => {
      mockNavigatorLanguage('en-US');
      service = createService();

      await service.switchLocale('xx');

      expect(service.getLocale()).toBe('en');
    });
  });
});
