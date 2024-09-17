import { FallbackPipe } from './fallback.pipe';
import { IMultiLanguage } from '../../core/multi-language-class';

describe('FallbackPipe', () => {
  let pipe: FallbackPipe;

  beforeEach(() => {
    pipe = new FallbackPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return null if source is undefined', () => {
    expect(pipe.transform(undefined, 'en')).toBeNull();
  });

  it('should return language-specific string if it exists', () => {
    const multiLang: IMultiLanguage = {
      de: 'hallo',
      fr: 'bonjour',
      it: 'ciao',
      en: 'hello',
      // Andere Eigenschaften, falls vorhanden
    };
    expect(pipe.transform(multiLang, 'de')).toBe('hallo');
    expect(pipe.transform(multiLang, 'fr')).toBe('bonjour');
    expect(pipe.transform(multiLang, 'it')).toBe('ciao');
    expect(pipe.transform(multiLang, 'en')).toBe('hello');
  });

  it('should return first non-null language string if requested language does not exist', () => {
    const multiLang: IMultiLanguage = {
      de: 'hallo',
      fr: 'bonjour',
      it: undefined,
      en: 'hello',
      // Andere Eigenschaften, falls vorhanden
    };
    expect(pipe.transform(multiLang, 'it')).toBe('hallo'); // 'de' ist die erste Nicht-Null-Sprache
  });
});
