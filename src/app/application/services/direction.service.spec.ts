import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { DirectionService } from './direction.service';
import { LocaleService } from './locale.service';
import { LanguageConfigService } from './language-config.service';

describe('DirectionService', () => {
  let service: DirectionService;
  let localeSignal: WritableSignal<string>;
  let originalDir: string;
  let originalLang: string;

  beforeEach(() => {
    originalDir = document.documentElement.dir;
    originalLang = document.documentElement.lang;

    localeSignal = signal('en');

    TestBed.configureTestingModule({
      providers: [
        DirectionService,
        { provide: LocaleService, useValue: { locale: localeSignal } },
        { provide: LanguageConfigService, useValue: { getLanguageMetadata: () => undefined } },
      ],
    });

    service = TestBed.inject(DirectionService);
  });

  afterEach(() => {
    document.documentElement.dir = originalDir;
    document.documentElement.lang = originalLang;
  });

  describe('LTR languages', () => {
    it('should return ltr for English', () => {
      TestBed.flushEffects();
      localeSignal.set('en');
      TestBed.flushEffects();
      expect(service.direction()).toBe('ltr');
    });

    it('should return ltr for German', () => {
      localeSignal.set('de');
      TestBed.flushEffects();
      expect(service.direction()).toBe('ltr');
    });

    it('should return ltr for French', () => {
      localeSignal.set('fr');
      TestBed.flushEffects();
      expect(service.direction()).toBe('ltr');
    });
  });

  describe('RTL languages', () => {
    it('should return rtl for Arabic', () => {
      localeSignal.set('ar');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });

    it('should return rtl for Hebrew', () => {
      localeSignal.set('he');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });

    it('should return rtl for Farsi', () => {
      localeSignal.set('fa');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });

    it('should return rtl for Urdu', () => {
      localeSignal.set('ur');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });

    it('should return rtl for Yiddish', () => {
      localeSignal.set('yi');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });
  });

  describe('document side effects', () => {
    it('should set document.documentElement.dir correctly', () => {
      localeSignal.set('ar');
      TestBed.flushEffects();
      expect(document.documentElement.dir).toBe('rtl');

      localeSignal.set('en');
      TestBed.flushEffects();
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should set document.documentElement.lang correctly', () => {
      localeSignal.set('fr');
      TestBed.flushEffects();
      expect(document.documentElement.lang).toBe('fr');

      localeSignal.set('ar');
      TestBed.flushEffects();
      expect(document.documentElement.lang).toBe('ar');
    });
  });

  describe('locale with region code', () => {
    it('should return rtl for ar-SA', () => {
      localeSignal.set('ar-SA');
      TestBed.flushEffects();
      expect(service.direction()).toBe('rtl');
    });

    it('should set document.documentElement.lang to full locale', () => {
      localeSignal.set('ar-SA');
      TestBed.flushEffects();
      expect(document.documentElement.lang).toBe('ar-SA');
    });
  });
});
