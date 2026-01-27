import { IMultiLanguage } from 'src/app/domain/models/multi-language-class';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';

let languageConfigService: LanguageConfigService | null = null;

export function initializeLanguageHelper(service: LanguageConfigService): void {
  languageConfigService = service;
}

export function getLocalizedValue(
  source: IMultiLanguage | undefined | null,
  language: string
): string {
  if (!source) {
    return '';
  }

  const fallbackOrder = languageConfigService?.getFallbackOrder() ?? ['de', 'fr', 'it', 'en'];
  const candidates = [source[language as keyof IMultiLanguage], ...fallbackOrder.map(lang => source[lang as keyof IMultiLanguage])];

  return candidates.find((x) => x || x === '') ?? '';
}
