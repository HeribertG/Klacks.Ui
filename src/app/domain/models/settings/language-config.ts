// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type Language = string;

export interface LanguageConfigResponse {
  supportedLanguages: string[];
  fallbackOrder: string[];
  defaultLanguage?: string;
  metadata: Record<string, LanguageMetadata>;
}

export interface LanguageMetadata {
  name: string;
  displayName: string;
  speechLocale: string;
  direction?: 'ltr' | 'rtl';
}
