// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface LanguagePluginInfo {
  code: string;
  name: string;
  displayName: string;
  speechLocale: string;
  version: string;
  author: string;
  coverage: number;
  isInstalled: boolean;
  isCore: boolean;
  translationCount: number;
}
