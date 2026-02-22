// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { ILanguageConfig } from 'src/app/domain/interfaces/language-config.interface';

let languageConfigService: ILanguageConfig | null = null;

export function initializeLanguageHelper(service: ILanguageConfig): void {
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
