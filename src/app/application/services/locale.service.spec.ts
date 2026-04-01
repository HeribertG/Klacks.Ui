import { TestBed } from '@angular/core/testing';

import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let service: LocaleService;
  let originalLanguageGetter: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalLanguageGetter = Object.getOwnPropertyDescriptor(navigator, 'language');
  });

  afterEach(() => {
    if (originalLanguageGetter) {
      Object.defineProperty(navigator, 'language', originalLanguageGetter);
    }
  });

  function mockNavigatorLanguage(value: string) {
    Object.defineProperty(navigator, 'language', { get: () => value, configurable: true });
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
});
