// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface LanguageConfigResponse {
  supportedLanguages: string[];
  fallbackOrder: string[];
  metadata: Record<string, LanguageMetadata>;
}

export interface LanguageMetadata {
  name: string;
  displayName: string;
  speechLocale: string;
}
