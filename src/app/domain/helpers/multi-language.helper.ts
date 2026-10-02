// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { ILanguageConfig } from 'src/app/domain/interfaces/language-config.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';

const CORE_LANGUAGE_FALLBACK_ORDER = ['de', 'fr', 'it', 'en'];

let languageConfigService: ILanguageConfig | null = null;

export function initializeLanguageHelper(service: ILanguageConfig): void {
  languageConfigService = service;
}

/**
 * Returns the lower-case MultiLanguage key for a UI language code (e.g. "zh-CN" -> "zh-cn").
 * @param language - UI language code; null or undefined yields an empty key
 */
export function toLanguageKey(language: string | null | undefined): string {
  return (language ?? '').toLowerCase();
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
    source[toLanguageKey(language)],
    source[language as keyof IMultiLanguage],
    source[DomainMessages.DEFAULT_LANG as keyof IMultiLanguage],
    ...fallbackOrder.map((lang) => source[lang as keyof IMultiLanguage]),
    ...Object.values(source),
  ];

  return candidates.find((value) => typeof value === 'string' && value !== '') ?? '';
}
