// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { LanguageMetadata } from './language-metadata.interface';

export type Language = string;

export interface LanguageConfigResponse {
  supportedLanguages: string[];
  fallbackOrder: string[];
  defaultLanguage?: string;
  metadata: Record<string, LanguageMetadata>;
}
