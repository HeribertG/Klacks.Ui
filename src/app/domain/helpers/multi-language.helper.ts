// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { ILanguageConfig } from 'src/app/domain/interfaces/language-config.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';

const CORE_LANGUAGE_FALLBACK_ORDER = ['de', 'fr', 'it', 'en'];

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

  const fallbackOrder = languageConfigService?.getFallbackOrder() ?? CORE_LANGUAGE_FALLBACK_ORDER;
  const candidates = [
    source[language as keyof IMultiLanguage],
    source[DomainMessages.DEFAULT_LANG as keyof IMultiLanguage],
    ...fallbackOrder.map((lang) => source[lang as keyof IMultiLanguage]),
    ...Object.values(source),
  ];

  return candidates.find((value) => typeof value === 'string' && value !== '') ?? '';
}
